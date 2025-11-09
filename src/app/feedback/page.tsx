'use client'

import { useAuth } from '@/contexts/AuthContext'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { toast } from 'sonner'

const FEEDBACK_TYPES = [
  { value: 'issue', label: 'Reporte de problema' },
  { value: 'idea', label: 'Nueva idea' },
  { value: 'praise', label: 'Reconocimiento' },
  { value: 'other', label: 'Otro' },
] as const

type FeedbackType = (typeof FEEDBACK_TYPES)[number]['value']

export default function FeedbackPage() {
  const supabase = createClient()
  const { user } = useAuth()
  const router = useRouter()

  const [feedbackType, setFeedbackType] = useState<FeedbackType>('issue')
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [contact, setContact] = useState('')
  const [contactType, setContactType] = useState<'email' | 'phone' | 'other'>('email')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (!message.trim()) {
      toast.error('Cuéntanos un poco más sobre tu feedback antes de enviarlo.')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('feedback').insert({
        user_id: user?.id ?? null,
        feedback_type: feedbackType,
        title: title.trim() || null,
        message: message.trim(),
        contact: contact.trim() || null,
      })

      if (error) {
        console.error('Error enviando feedback:', error)
        toast.error('No pudimos guardar tu feedback. Intenta nuevamente en unos minutos.')
        return
      }

      setTitle('')
      setMessage('')
      setContact('')
      setContactType('email')
      setFeedbackType('issue')
      toast.success('¡Gracias por apoyar a Focus Flow! Tus comentarios nos ayudan a crecer.')
      setTimeout(() => {
        router.back()
      }, 400)
    } catch (submissionError) {
      console.error('Error inesperado enviando feedback:', submissionError)
      toast.error('Ocurrió un error inesperado al enviar tu feedback.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background via-background/95 to-background pt-20 pb-16">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-purple-500/20 bg-card/80 backdrop-blur-xl shadow-xl shadow-purple-500/10 p-8 sm:p-10">
          <div className="mb-10 text-center space-y-4">
            <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-gradient-to-br from-purple-600/20 to-blue-600/20 border border-purple-500/30 text-purple-600">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 20l9-5-9-5-9 5 9 5z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.75}
                  d="M12 12l9-5-9-5-9 5 9 5z"
                />
              </svg>
            </div>
            <h1 className="text-3xl font-bold text-foreground sm:text-4xl">
              Comparte tu feedback
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Queremos construir la mejor experiencia posible. Cuéntanos qué podemos mejorar, qué idea te emociona o qué te encanta de Focus Flow.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <button
                type="button"
                onClick={() => router.back()}
                className="inline-flex items-center justify-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2 text-sm text-muted-foreground transition hover:border-purple-500/40 hover:bg-background hover:text-foreground"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 19l-7-7 7-7" />
                </svg>
                Volver
              </button>
              <span className="text-xs text-muted-foreground">
                Tus datos están seguros. Solo los usamos si necesitamos contactar contigo sobre este feedback.
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {FEEDBACK_TYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setFeedbackType(option.value)}
                  className={`rounded-2xl border p-4 text-left transition-all ${
                    feedbackType === option.value
                      ? 'border-purple-500/60 bg-purple-500/10 text-foreground shadow-lg shadow-purple-500/10'
                      : 'border-border bg-background/60 hover:border-purple-500/30 hover:bg-background/80 text-muted-foreground'
                  }`}
                >
                  <p className="text-sm font-semibold capitalize">{option.label}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {option.value === 'issue' && 'Reporta un error o algo que no funciona como esperas.'}
                    {option.value === 'idea' && 'Propón mejoras o nuevas funcionalidades que te gustaría ver.'}
                    {option.value === 'praise' && 'Cuéntanos qué experiencias te han encantado.'}
                    {option.value === 'other' && 'Cualquier otro comentario que quieras compartir con el equipo.'}
                  </p>
                </button>
              ))}
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback-title" className="text-sm font-medium text-foreground">
                Título (opcional)
              </label>
              <input
                id="feedback-title"
                type="text"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Ejemplo: Error al conectar Google Calendar"
                className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="feedback-message" className="text-sm font-medium text-foreground">
                Detalles
              </label>
              <textarea
                id="feedback-message"
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                placeholder="Cuéntanos qué pasó, qué idea tienes o cómo podemos ayudarte mejor."
                rows={6}
                className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition resize-none"
                required
              />
            </div>

            <div className="space-y-3">
              <label htmlFor="feedback-contact" className="text-sm font-medium text-foreground">
                ¿Cómo podemos contactarte? (opcional)
              </label>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setContactType('email')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    contactType === 'email'
                      ? 'bg-purple-500/20 text-purple-600 border border-purple-500/40'
                      : 'border border-border bg-background/60 text-muted-foreground hover:border-purple-500/30 hover:text-foreground'
                  }`}
                >
                  Email
                </button>
                <button
                  type="button"
                  onClick={() => setContactType('phone')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    contactType === 'phone'
                      ? 'bg-purple-500/20 text-purple-600 border border-purple-500/40'
                      : 'border border-border bg-background/60 text-muted-foreground hover:border-purple-500/30 hover:text-foreground'
                  }`}
                >
                  Teléfono
                </button>
                <button
                  type="button"
                  onClick={() => setContactType('other')}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    contactType === 'other'
                      ? 'bg-purple-500/20 text-purple-600 border border-purple-500/40'
                      : 'border border-border bg-background/60 text-muted-foreground hover:border-purple-500/30 hover:text-foreground'
                  }`}
                >
                  Otro
                </button>
              </div>
              <input
                id="feedback-contact"
                type={contactType === 'phone' ? 'tel' : contactType === 'email' ? 'email' : 'text'}
                value={contact}
                onChange={(event) => setContact(event.target.value)}
                placeholder={
                  contactType === 'phone'
                    ? 'Ejemplo: +57 300 1234567'
                    : contactType === 'email'
                    ? 'Tu correo electrónico'
                    : 'Tu canal preferido (Telegram, WhatsApp, etc.)'
                }
                className="w-full rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:border-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/20 transition"
              />
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 sm:gap-6 pt-2">
              <p className="text-xs text-muted-foreground">
                El equipo revisa cada feedback. El estado aparece como resuelto cuando el comentario ha sido atendido.
              </p>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-purple-600 to-blue-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-purple-500/20 transition hover:from-purple-500 hover:to-blue-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {isSubmitting ? 'Enviando...' : 'Enviar feedback'}
              </button>
            </div>
          </form>
        </div>
      </section>
    </main>
  )
}

