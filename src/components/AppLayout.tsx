'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import Navbar from './Navbar'
import NewUserOnboardingModal from './auth/NewUserOnboardingModal'

interface AppLayoutProps {
  children: React.ReactNode
  showNavbar?: boolean
}

export default function AppLayout({ children, showNavbar = true }: AppLayoutProps) {
  const { loading } = useAuth()
  const pathname = usePathname()

  // Don't show navbar on login page
  const isLoginPage = pathname === '/login'
  const isChatPage = pathname.startsWith('/foco')
  
  if (isLoginPage) {
    return <>{children}</>
  }

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

  const isDashboardPage = pathname.startsWith('/dashboard')
  const isCalendarPage = pathname.startsWith('/calendar')
  
  const mainClasses = (() => {
    if (isChatPage) {
      return 'min-h-[100dvh] pt-12 flex flex-col overflow-hidden'
    }
    if (isDashboardPage || isCalendarPage) {
      return 'h-screen pt-12 overflow-hidden'
    }
    if (showNavbar) {
      return 'pt-12'
    }
    return ''
  })()

  return (
    <div className={isDashboardPage || isCalendarPage ? 'h-screen bg-background overflow-hidden relative' : 'min-h-screen bg-background relative'}>
      {showNavbar && <Navbar />}
      <main className={mainClasses}>
        {children}
      </main>
      <NewUserOnboardingModal />
    </div>
  )
}
