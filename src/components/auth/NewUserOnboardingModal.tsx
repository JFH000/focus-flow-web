"use client"

import { useAuth } from '@/contexts/AuthContext'
import { cn } from '@/lib/utils'
import { Check, PartyPopper, Sparkles, User } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { toast } from 'sonner'

const HOW_MET_OPTIONS = [
  'Expoandes',
  'Un amigo',
  'Otro',
] as const

type Step = 'intro' | 'form' | 'success'

export default function NewUserOnboardingModal() {
  const { needsOnboarding, onboardingLoading, completeOnboarding, user } = useAuth()
  const [step, setStep] = useState<Step>('intro')
  const [fullName, setFullName] = useState('')
  const [age, setAge] = useState<string>('')
  const [howMet, setHowMet] = useState<string>('')
  const [otherHowMet, setOtherHowMet] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    if (!needsOnboarding) {
      setStep('intro')
      setFullName('')
      setAge('')
      setHowMet('')
      setOtherHowMet('')
      setSubmitting(false)
    }
  }, [needsOnboarding])

  const effectiveHowMet = useMemo(() => {
    if (howMet === 'Otro') {
      return otherHowMet.trim()
    }
    return howMet
  }, [howMet, otherHowMet])

  const currentAge = useMemo(() => {
    const parsed = Number(age)
    return Number.isFinite(parsed) ? parsed : null
  }, [age])

  const ageError = useMemo(() => {
    if (!age) return ''
    if (!currentAge) return 'Ingresa una edad válida'
    if (currentAge < 5 || currentAge > 120) return 'Edad fuera de rango'
    return ''
  }, [age, currentAge])

  const isFormValid = useMemo(() => {
    if (!fullName.trim()) return false
    if (!effectiveHowMet) return false
    if (ageError) return false
    return true
  }, [fullName, effectiveHowMet, ageError])

  if (!needsOnboarding || onboardingLoading) {
    return null
  }

  const handleSubmit = async () => {
    if (!isFormValid || submitting) return

    try {
      setSubmitting(true)
      const { success, error } = await completeOnboarding({
        fullName,
        age: currentAge,
        howMet: effectiveHowMet,
      })

      if (!success) {
        toast.error(error ?? 'No pudimos guardar tu información. Intenta de nuevo.')
        return
      }

      toast.success(`¡Gracias por unirte a Focus Flow${fullName ? `, ${fullName.split(' ')[0]}` : ''}!`)
      setStep('success')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-background/85 backdrop-blur-md">
      <div className="w-full max-w-4xl mx-4 overflow-hidden rounded-3xl border border-border/60 bg-gradient-to-br from-background/95 via-background/90 to-background/95 shadow-[0_40px_120px_rgba(76,29,149,0.35)]">
        <div className="grid gap-8 lg:grid-cols-[1.15fr_1fr]">
          <div className="relative overflow-hidden p-8 lg:p-12 bg-gradient-to-br from-purple-600/20 via-blue-600/15 to-background">
            <div className="absolute top-10 right-10 h-24 w-24 rounded-full bg-purple-500/30 blur-3xl" />
            <div className="absolute -bottom-16 -left-10 h-40 w-40 rounded-full bg-blue-500/25 blur-3xl" />

            <div className="relative space-y-6 text-white">
              <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em]">
                <Sparkles className="h-4 w-4" />
                Bienvenida
              </div>

              <h2 className="text-3xl lg:text-[2.4rem] font-bold leading-snug">
                {step === 'success'
                  ? '¡Todo listo!'
                  : 'Construyamos tu experiencia Focus Flow'}
              </h2>

              <p className="text-white/80 text-sm lg:text-base leading-relaxed">
                {step === 'success'
                  ? 'Guardamos tu perfil. En unos segundos te llevaremos a tu panel para que empieces a organizarlo todo con Focus Flow.'
                  : 'Queremos conocerte para recomendarte el mejor camino. Responde estas preguntas rápidas y personalizaremos tu experiencia desde el inicio.'}
              </p>

              <div className="flex flex-col gap-4 pt-4">
                <ProgressStep label="Bienvenida" active={step === 'intro'} completed={step !== 'intro'} />
                <ProgressStep label="Tu perfil" active={step === 'form'} completed={step === 'success'} />
                <ProgressStep label="Listo para empezar" active={step === 'success'} completed={step === 'success'} />
              </div>
            </div>
          </div>

          <div className="relative p-8 lg:p-10 flex flex-col gap-6">
            {step === 'intro' && (
              <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom duration-500">
                <div className="flex items-center gap-3 text-primary">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10">
                    <User className="h-5 w-5" />
                  </div>
                  <span className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Hola {user?.email?.split('@')[0] ?? '👋'}</span>
                </div>
                <h3 className="text-2xl font-semibold">Queremos conocerte</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  En menos de un minuto tendremos tu perfil personalizado. Esto nos ayuda a sugerirte hábitos, recordatorios y automatizaciones a tu medida.
                </p>
                <button
                  onClick={() => setStep('form')}
                  className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-[1.01]"
                >
                  ¡Vamos a ello!
                </button>
              </div>
            )}

            {step === 'form' && (
              <div className="space-y-5 animate-in fade-in slide-in-from-bottom duration-500">
                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Tu nombre</label>
                  <input
                    value={fullName}
                    onChange={(event) => setFullName(event.target.value)}
                    placeholder="¿Cómo te gustaría que te llamemos?"
                    className="mt-1 w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Edad</label>
                  <input
                    value={age}
                    onChange={(event) => setAge(event.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="Opcional"
                    inputMode="numeric"
                    className={cn(
                      'mt-1 w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20',
                      ageError ? 'border-destructive focus:ring-destructive/20' : 'focus:border-primary'
                    )}
                  />
                  {ageError && <p className="mt-1 text-xs text-destructive">{ageError}</p>}
                </div>

                <div className="space-y-3">
                  <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">¿Cómo conociste Focus Flow?</label>
                  <div className="grid grid-cols-1 gap-2">
                    {HOW_MET_OPTIONS.map((option) => {
                      const selected = howMet === option
                      return (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setHowMet(option)}
                          className={cn(
                            'rounded-xl border px-4 py-3 text-left text-sm transition',
                            selected
                              ? 'border-primary bg-primary/10 text-primary shadow-inner'
                              : 'border-border bg-background/70 hover:border-primary/30'
                          )}
                        >
                          {option}
                        </button>
                      )
                    })}
                  </div>
                  {howMet === 'Otro' && (
                    <input
                      value={otherHowMet}
                      onChange={(event) => setOtherHowMet(event.target.value)}
                      placeholder="Cuéntanos brevemente"
                      className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                    />
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <button
                    onClick={() => setStep('intro')}
                    className="text-sm font-medium text-muted-foreground transition hover:text-foreground"
                  >
                    ← Volver
                  </button>
                  <button
                    onClick={handleSubmit}
                    disabled={!isFormValid || submitting}
                    className="inline-flex items-center justify-center rounded-2xl bg-gradient-to-r from-primary to-purple-500 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition hover:scale-[1.01] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {submitting ? 'Guardando...' : 'Crear mi perfil'}
                  </button>
                </div>
              </div>
            )}

            {step === 'success' && (
              <div className="flex flex-col items-center gap-4 text-center py-6 animate-in fade-in slide-in-from-bottom duration-500">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/15 text-primary">
                  <PartyPopper className="h-7 w-7" />
                </div>
                <h3 className="text-2xl font-semibold">¡Bienvenido a bordo!</h3>
                <p className="text-sm text-muted-foreground leading-relaxed max-w-sm">
                  Configuraremos tu espacio inicial según tus respuestas. Esto tomará solo un momento.
                </p>
                <div className="flex items-center gap-2 text-xs font-medium text-primary">
                  <Check className="h-4 w-4" /> Perfil configurado
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProgressStep({ label, active, completed }: { label: string; active: boolean; completed: boolean }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border px-4 py-2 transition',
        completed ? 'border-white/40 bg-white/15 text-white' : active ? 'border-white/30 bg-white/10 text-white' : 'border-white/10 text-white/70'
      )}
    >
      <span className={cn('flex h-6 w-6 items-center justify-center rounded-full text-xs font-semibold', completed ? 'bg-white text-purple-600' : active ? 'bg-white/70 text-purple-600' : 'bg-white/10 text-white/70')}>
        {completed ? <Check className="h-4 w-4" /> : active ? '•' : ''}
      </span>
      <span className="text-xs font-medium tracking-wide uppercase">{label}</span>
    </div>
  )
}
