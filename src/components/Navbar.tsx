'use client'

import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import { useState } from 'react'

interface NavbarProps {
  className?: string
}

export default function Navbar({ className = '' }: NavbarProps) {
  const { user, signOut } = useAuth()
  const { theme, resolvedTheme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showThemeMenu, setShowThemeMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
    // Redirigir al login después de cerrar sesión
    router.push('/login')
  }

  const handleProfileClick = () => {
    setShowUserMenu(!showUserMenu)
  }

  const handleThemeClick = () => {
    setShowThemeMenu(!showThemeMenu)
  }

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme)
    setShowThemeMenu(false)
  }

  const getThemeIcon = () => {
    if (theme === 'system') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      )
    } else if (theme === 'dark') {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
        </svg>
      )
    } else {
      return (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
        </svg>
      )
    }
  }

  const getThemeLabel = () => {
    if (theme === 'system') return 'Sistema'
    if (theme === 'dark') return 'Oscuro'
    return 'Claro'
  }

  return (
    <nav className={`fixed top-0 left-0 right-0 z-50 bg-card border-b border-border ${className}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Logo and Navigation */}
          <div className="flex items-center space-x-6">
            <button
              onClick={() => router.push('/foco')}
              className="flex items-center gap-2"
            >
              <h1 className="text-sm font-semibold bg-gradient-to-r from-purple-600 via-pink-500 via-blue-500 to-purple-600 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
                FocusFlow
              </h1>
            </button>

          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">

            {/* User menu */}
            <div className="relative">
              <button
                onClick={handleProfileClick}
                className="flex items-center space-x-2 p-2 rounded-lg hover:bg-muted transition-colors"
              >
                {/* Profile picture or avatar */}
                <div className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                  {user?.user_metadata?.avatar_url ? (
                    <Image
                      src={user.user_metadata.avatar_url}
                      alt="Profile"
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                    </svg>
                  )}
                </div>
                <div className="hidden sm:block text-left">
                  <p className="text-sm font-medium text-card-foreground truncate max-w-32">
                    {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'Usuario'}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-muted-foreground transition-transform ${
                    showUserMenu ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown menu */}
              {showUserMenu && (
                <>
                  {/* Overlay */}
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowUserMenu(false)}
                  />
                  
                  {/* Menu */}
                  <div className="absolute right-0 mt-2 w-64 bg-card border border-border rounded-lg shadow-lg z-20">
                    <div className="p-4 border-b border-border">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                          {user?.user_metadata?.avatar_url ? (
                            <Image
                              src={user.user_metadata.avatar_url}
                              alt="Profile"
                              width={40}
                              height={40}
                              className="w-10 h-10 rounded-full object-cover"
                            />
                          ) : (
                            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                            </svg>
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-card-foreground truncate">
                            {user?.user_metadata?.full_name || 'Usuario'}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            {user?.email}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/foco')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
                          pathname.startsWith('/foco')
                            ? 'bg-primary/10 text-primary'
                            : 'text-card-foreground hover:bg-muted'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span>Foco</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/calendar')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
                          pathname.startsWith('/calendar')
                            ? 'bg-primary/10 text-primary'
                            : 'text-card-foreground hover:bg-muted'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        <span>Calendar</span>
                      </button>
                      
                      <button
                        onClick={() => {
                          setShowUserMenu(false)
                          router.push('/dashboard')
                        }}
                        className={`w-full px-4 py-2 text-left text-sm transition-colors flex items-center space-x-2 ${
                          pathname.startsWith('/dashboard')
                            ? 'bg-primary/10 text-primary'
                            : 'text-card-foreground hover:bg-muted'
                        }`}
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                        </svg>
                        <span>Dashboard</span>
                      </button>
                      
                      {/* Toggle de tema compacto */}
                      <div className="px-4 py-2">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-muted-foreground">Tema</span>
                        </div>
                        <div className="flex bg-muted rounded-lg p-1">
                          <button
                            onClick={() => handleThemeChange('light')}
                            className={`flex-1 flex items-center justify-center p-2 rounded-md transition-all ${
                              theme === 'light' 
                                ? 'bg-background text-foreground shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Modo claro"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleThemeChange('system')}
                            className={`flex-1 flex items-center justify-center p-2 rounded-md transition-all ${
                              theme === 'system' 
                                ? 'bg-background text-foreground shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Modo sistema"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </button>
                          
                          <button
                            onClick={() => handleThemeChange('dark')}
                            className={`flex-1 flex items-center justify-center p-2 rounded-md transition-all ${
                              theme === 'dark' 
                                ? 'bg-background text-foreground shadow-sm' 
                                : 'text-muted-foreground hover:text-foreground'
                            }`}
                            title="Modo oscuro"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      
                    </div>
                    
                    <div className="border-t border-border py-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-2 text-left text-sm text-destructive hover:bg-destructive/10 transition-colors flex items-center space-x-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Cerrar Sesión</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </nav>
  )
}
