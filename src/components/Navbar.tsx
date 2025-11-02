"use client"

import { useAuth } from "@/contexts/AuthContext"
import { useTheme } from "@/contexts/ThemeContext"
import Image from "next/image"
import { usePathname, useRouter } from "next/navigation"
import { useState } from "react"

interface NavbarProps {
  className?: string
}

export default function Navbar({ className = "" }: NavbarProps) {
  const { user, signOut } = useAuth()
  const { theme, setTheme } = useTheme()
  const router = useRouter()
  const pathname = usePathname()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const handleSignOut = async () => {
    await signOut()
    setShowUserMenu(false)
    router.push("/login")
  }

  const handleThemeChange = (newTheme: "light" | "dark" | "system") => {
    setTheme(newTheme)
  }

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 backdrop-blur-xl bg-gradient-to-r from-purple-600/10 via-blue-600/10 to-purple-600/10 border-b border-purple-500/20 ${className}`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-12">
          {/* Logo and Brand */}
          <div className="flex items-center space-x-3">
            <button onClick={() => router.push("/foco")} className="flex items-center gap-3 group">
              {/* Brand Name */}
              <h1 className="text-xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 bg-clip-text text-transparent bg-[length:200%_100%] animate-gradient-x">
                FocusFlow
              </h1>
            </button>
          </div>

          {/* Center - Navigation buttons */}
          {/* Desktop: Botones con texto */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => router.push("/foco")}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                pathname.startsWith("/foco")
                  ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-600 font-medium"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
              <span>Foco</span>
            </button>

            <button
              onClick={() => router.push("/calendar")}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                pathname.startsWith("/calendar")
                  ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-600 font-medium"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
              <span>Calendar</span>
            </button>

            <button
              onClick={() => router.push("/dashboard")}
              className={`px-4 py-2 text-sm rounded-lg transition-all duration-200 flex items-center space-x-2 ${
                pathname.startsWith("/dashboard")
                  ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-600 font-medium"
                  : "text-foreground hover:bg-muted/50"
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                />
              </svg>
              <span>Dashboard</span>
            </button>
          </div>

          {/* Mobile: Solo iconos de Chat y Calendar */}
          <div className="flex md:hidden items-center gap-2">
            <button
              onClick={() => router.push("/foco")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                pathname.startsWith("/foco")
                  ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-600"
                  : "text-foreground hover:bg-muted/50"
              }`}
              title="Chat"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                />
              </svg>
            </button>

            <button
              onClick={() => router.push("/calendar")}
              className={`p-2 rounded-lg transition-all duration-200 ${
                pathname.startsWith("/calendar")
                  ? "bg-gradient-to-r from-purple-600/20 to-blue-600/20 text-purple-600"
                  : "text-foreground hover:bg-muted/50"
              }`}
              title="Calendario"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            </button>
          </div>

          {/* Right side - User menu */}
          <div className="flex items-center">
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center space-x-2 px-3 py-1.5 rounded-lg bg-gradient-to-r from-purple-600/10 to-blue-600/10 hover:from-purple-600/20 hover:to-blue-600/20 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300 group"
              >
                {/* Profile picture */}
                <div className="relative w-6 h-6 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 p-[1px] group-hover:scale-105 transition-transform">
                  <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                    {user?.user_metadata?.avatar_url ? (
                      <Image
                        src={user.user_metadata.avatar_url || "/placeholder.svg"}
                        alt="Profile"
                        width={24}
                        height={24}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <svg className="w-4 h-4 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                      </svg>
                    )}
                  </div>
                </div>

                {/* User name */}
                <div className="hidden sm:block text-left">
                  <p className="text-xs font-medium text-foreground truncate max-w-28">
                    {user?.user_metadata?.full_name || user?.email?.split("@")[0] || "Usuario"}
                  </p>
                </div>

                {/* Dropdown arrow */}
                <svg
                  className={`w-3 h-3 text-muted-foreground transition-transform duration-300 ${
                    showUserMenu ? "rotate-180" : ""
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
                  <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />

                  {/* Menu */}
                  <div className="absolute right-0 mt-3 w-72 bg-card/98 backdrop-blur-xl border border-purple-500/20 rounded-2xl shadow-2xl shadow-purple-500/10 z-20 overflow-hidden">
                    {/* User info header */}
                    <div className="p-5 bg-gradient-to-br from-purple-600/10 to-blue-600/10 border-b border-purple-500/20">
                      <div className="flex items-center space-x-3">
                        <div className="relative w-12 h-12 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 p-[2px]">
                          <div className="w-full h-full rounded-full bg-background flex items-center justify-center overflow-hidden">
                            {user?.user_metadata?.avatar_url ? (
                              <Image
                                src={user.user_metadata.avatar_url || "/placeholder.svg"}
                                alt="Profile"
                                width={48}
                                height={48}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <svg className="w-7 h-7 text-purple-600" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                              </svg>
                            )}
                          </div>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-foreground truncate">
                            {user?.user_metadata?.full_name || "Usuario"}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                        </div>
                      </div>
                    </div>

                    

                    


                    {/* Theme selector */}
                    <div className="px-4 py-3 border-t border-purple-500/20">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Tema</span>
                      </div>
                      <div className="flex bg-muted/50 rounded-xl p-1.5 gap-1">
                        <button
                          onClick={() => handleThemeChange("light")}
                          className={`flex-1 flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 ${
                            theme === "light"
                              ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title="Modo claro"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleThemeChange("system")}
                          className={`flex-1 flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 ${
                            theme === "system"
                              ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title="Modo sistema"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                            />
                          </svg>
                        </button>

                        <button
                          onClick={() => handleThemeChange("dark")}
                          className={`flex-1 flex items-center justify-center p-2.5 rounded-lg transition-all duration-200 ${
                            theme === "dark"
                              ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-500/30"
                              : "text-muted-foreground hover:text-foreground hover:bg-muted"
                          }`}
                          title="Modo oscuro"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Sign out */}
                    <div className="border-t border-purple-500/20 p-2">
                      <button
                        onClick={handleSignOut}
                        className="w-full px-4 py-3 text-left text-sm text-red-500 hover:bg-red-500/10 rounded-xl transition-all duration-200 flex items-center space-x-3 group"
                      >
                        <div className="w-8 h-8 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 flex items-center justify-center transition-colors">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                          </svg>
                        </div>
                        <span className="font-medium">Cerrar Sesión</span>
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
