'use client'

import { useAuth } from '@/contexts/AuthContext'
import { usePathname } from 'next/navigation'
import HealthStatus from './HealthStatus'
import Navbar from './Navbar'

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
  
  return (
    <div className={isDashboardPage ? 'h-screen bg-background overflow-hidden' : 'min-h-screen bg-background'}>
      {showNavbar && <Navbar />}
      <HealthStatus />
      <main className={isChatPage ? 'h-screen pt-12' : isDashboardPage ? 'h-screen pt-12 overflow-hidden' : showNavbar ? 'pt-12' : ''}>
        {children}
      </main>
    </div>
  )
}
