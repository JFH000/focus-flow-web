"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Brain, Calendar, FileText, Monitor, Moon, Sparkles, Sun } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from 'next/navigation'
import { useEffect, useState } from "react"

const FEATURES = [
  {
    icon: Brain,
    title: "IA Avanzada",
    description: "Asistente inteligente que responde tus dudas académicas",
  },
  {
    icon: FileText,
    title: "Documentos con Memoria",
    description: "Sube tus apuntes y la IA los recordará",
  },
  {
    icon: Calendar,
    title: "Calendario Inteligente",
    description: "Organiza tus exámenes y tareas automáticamente",
  },
  {
    icon: Sparkles,
    title: "Sincronización",
    description: "Conecta con Google Calendar y más",
  },
] as const

export default function LoginPage() {
  const { user, loading, signInWithGoogle } = useAuth()
  const { theme, toggleTheme, resolvedTheme } = useTheme()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [activeFeatureIndex, setActiveFeatureIndex] = useState(0)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && user) {
      router.push('/')
    }
  }, [user, loading, router])

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveFeatureIndex((prev) => (prev + 1) % FEATURES.length)
    }, 4000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="loading-shimmer w-16 h-16 rounded-full mx-auto mb-4"></div>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    )
  }

  if (user) {
    return null
  }

  if (!mounted) {
    return null
  }

  const getThemeIcon = () => {
    if (theme === 'light') return <Sun className="w-5 h-5" />
    if (theme === 'dark') return <Moon className="w-5 h-5" />
    return <Monitor className="w-5 h-5" />
  }

  const getThemeTooltip = () => {
    if (theme === 'system') return `Tema: Sistema (${resolvedTheme})`
    if (theme === 'dark') return 'Tema: Oscuro'
    return 'Tema: Claro'
  }

  const rotatingFeature = FEATURES[activeFeatureIndex]

  return (
    <div className="relative h-screen min-h-screen bg-background flex overflow-hidden">
      {/* Theme Toggle */}
      <button
        onClick={toggleTheme}
        className="fixed top-4 right-4 z-50 p-2 rounded-lg bg-card border hover:bg-accent transition-colors"
        aria-label="Toggle theme"
        title={getThemeTooltip()}
      >
        {getThemeIcon()}
      </button>

      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-primary/5 via-purple-500/5 to-background relative overflow-hidden">
        <div className="absolute -top-24 -left-20 h-80 w-80 rounded-full bg-primary/25 blur-3xl opacity-60 animate-[pulse_9s_ease_infinite]" />
        <div className="absolute top-1/4 -right-24 h-72 w-72 rounded-full bg-purple-500/30 blur-3xl opacity-60 animate-[pulse_13s_ease_infinite]" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl opacity-50" />
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.06]"></div>

        <div className="relative z-20 flex flex-col h-full px-12 xl:px-20 py-12">
          {/* Logo */}
          <Link href="/" className="inline-flex items-center gap-3 group">
            <Image
              src="/focusflow-logo-removebg-preview.png"
              alt="FocusFlow Logo"
              width={48}
              height={48}
              className="transition-transform group-hover:scale-110 rounded-lg"
            />
            <span className="text-3xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
              FocusFlow
            </span>
          </Link>

          <div className="flex-1 flex flex-col justify-center gap-6 mt-10 max-w-xl">
            {/* Headline */}
            <div className="space-y-3">
              <h1 className="text-4xl xl:text-[3.2rem] font-bold text-balance leading-tight">
                 Tu compañero de estudio con{" "}
                <span className="relative inline-block px-1">
                  <span className="absolute -inset-1 rounded-full bg-primary/20 blur-lg opacity-70" aria-hidden="true"></span>
                  <span className="relative bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x drop-shadow-[0_8px_30px_rgba(129,140,248,0.45)]">
                    Inteligencia Artificial
                  </span>
                </span>
              </h1>
              <p className="text-sm xl:text-base text-muted-foreground text-balance">
                Estudia más inteligente, no más difícil. Únete a miles de estudiantes que ya mejoraron sus resultados.
              </p>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-2 gap-3">
              {FEATURES.map((feature, index) => (
                <Card
                  key={index}
                  className={`p-3 bg-card/60 backdrop-blur-sm border-primary/10 transition-all duration-300 ${
                    activeFeatureIndex === index
                      ? 'scale-105 border-primary/40 shadow-lg shadow-primary/20'
                      : 'hover:border-primary/30 hover:scale-[1.02]'
                  }`}
                >
                  <feature.icon className={`w-6 h-6 mb-1.5 ${activeFeatureIndex === index ? 'text-primary' : 'text-primary/70'}`} />
                  <h3 className="font-semibold text-sm mb-0.5">{feature.title}</h3>
                  <p className="text-xs text-muted-foreground leading-snug">{feature.description}</p>
                </Card>
              ))}
            </div>
          </div>
        </div>

      </div>

      {/* Right Side - Login Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 overflow-hidden relative">

        <div className="w-full max-w-md space-y-8 relative z-10">
          {/* Mobile Logo */}
          <Link href="/" className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <Image src="/focusflow-logo-removebg-preview.png" alt="FocusFlow Logo" width={40} height={40} className="rounded-lg" />
            <span className="text-2xl font-bold bg-gradient-to-r from-primary via-purple-500 to-primary bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
              FocusFlow
            </span>
          </Link>

          <div className="relative">
            <div className="absolute -inset-[1.75px] rounded-3xl bg-gradient-to-r from-primary/40 via-purple-500/40 to-blue-500/40 opacity-80 blur-lg" aria-hidden="true"></div>
            <Card className="group relative p-8 shadow-[0_25px_60px_rgba(79,70,229,0.35)] border border-white/10 bg-card/95 backdrop-blur-lg rounded-3xl transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_30px_80px_rgba(79,70,229,0.45)] overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-purple-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
            <div className="text-center mb-8">
              <h2 className="text-3xl font-bold mb-2">Bienvenido de vuelta</h2>
              <p className="text-muted-foreground">Inicia sesión para continuar tu viaje de aprendizaje</p>
            </div>

            {/* Google Sign In Button */}
            <Button
              onClick={signInWithGoogle}
              disabled={loading}
              className="w-full h-12 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 hover:border-gray-400 shadow-sm hover:shadow-md transition-all duration-200 font-medium"
              size="lg"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-gray-300 border-t-primary rounded-full animate-spin"></div>
                  <span>Iniciando sesión...</span>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
                    <path
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      fill="#4285F4"
                    />
                    <path
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      fill="#34A853"
                    />
                    <path
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      fill="#FBBC05"
                    />
                    <path
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      fill="#EA4335"
                    />
                  </svg>
                  <span>Continuar con Google</span>
                </div>
              )}
            </Button>

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">Inicio de sesión seguro</span>
              </div>
            </div>

            {/* Benefits */}
            <div className="space-y-3 mb-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Acceso ilimitado a todas las funciones</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Sin tarjeta de crédito requerida</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <div className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-3 h-3 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <span>Cancela cuando quieras</span>
              </div>
            </div>

            {/* Terms */}
            <p className="text-xs text-center text-muted-foreground">
              Al iniciar sesión, aceptas nuestros{" "}
              <Link href="/terms" className="text-primary hover:underline">
                términos de servicio
              </Link>{" "}
              y{" "}
              <Link href="/privacy" className="text-primary hover:underline">
                política de privacidad
              </Link>
              .
            </p>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}