'use client'

import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

interface AuthContextType {
  user: User | null
  session: Session | null
  loading: boolean
  signInWithGoogle: () => Promise<void>
  connectGoogleCalendar: () => Promise<void>
  signOut: () => Promise<void>
  needsOnboarding: boolean
  onboardingLoading: boolean
  completeOnboarding: (payload: { fullName: string; age: number | null; howMet: string }) => Promise<{ success: boolean; error?: string }>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [needsOnboarding, setNeedsOnboarding] = useState(false)
  const [onboardingLoading, setOnboardingLoading] = useState(true)
  const supabase = useMemo(() => createClient(), [])

  const checkUserProfile = useCallback(async (currentUser: User | null) => {
    if (!currentUser) {
      setNeedsOnboarding(false)
      setOnboardingLoading(false)
      return
    }

    setOnboardingLoading(true)

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', currentUser.id)
        .maybeSingle()

      if (error) {
        console.error('Error checking user profile:', error)
        setNeedsOnboarding(false)
      } else {
        setNeedsOnboarding(!data)
      }
    } catch (error) {
      console.error('Unexpected error checking user profile:', error)
      setNeedsOnboarding(false)
    } finally {
      setOnboardingLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) throw error
        setSession(session)
        setUser(session?.user ?? null)
        checkUserProfile(session?.user ?? null).catch((profileError) => {
          console.error('Error checking user profile during initial session:', profileError)
        })
      } catch (error) {
        console.error('Error getting initial session:', error)
        setSession(null)
        setUser(null)
      } finally {
        setLoading(false)
      }
    }

    getInitialSession().catch((error) => {
      console.error('Unhandled error getting initial session:', error)
      setLoading(false)
    })

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        try {
          setSession(session)
          setUser(session?.user ?? null)
          checkUserProfile(session?.user ?? null).catch((profileError) => {
            console.error('Error checking user profile on auth state change:', profileError)
          })
        } catch (error) {
          console.error('Error handling auth state change:', error)
        } finally {
          setLoading(false)
        }
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase, checkUserProfile])

  const signInWithGoogle = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      })
      if (error) {
        console.error('Error signing in with Google:', error)
        throw error
      }
    } catch (error) {
      console.error('Error signing in with Google:', error)
      setLoading(false)
    }
  }

  const connectGoogleCalendar = async () => {
    try {
      setLoading(true)
      
      // First, sign out to clear any existing session
      await supabase.auth.signOut()
      
      // Then sign in with calendar scopes
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          scopes: 'https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events'
        }
      })
      
      if (error) {
        console.error('Error connecting Google Calendar:', error)
        throw error
      }
    } catch (error) {
      console.error('Error connecting Google Calendar:', error)
      setLoading(false)
    }
  }

  const completeOnboarding = useCallback(async ({ fullName, age, howMet }: { fullName: string; age: number | null; howMet: string }) => {
    if (!user) {
      return { success: false, error: 'Usuario no autenticado' }
    }

    try {
      setOnboardingLoading(true)

      const payload = {
        id: user.id,
        email: user.email ?? '',
        full_name: fullName.trim() || null,
        age: age ?? null,
        how_met: howMet.trim() || null,
      }

      const { error } = await supabase.from('user_profiles').insert(payload)

      if (error) {
        console.error('Error completing onboarding:', error)
        return { success: false, error: error.message }
      }

      setNeedsOnboarding(false)
      return { success: true }
    } catch (error) {
      console.error('Unexpected error completing onboarding:', error)
      return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' }
    } finally {
      setOnboardingLoading(false)
    }
  }, [supabase, user])

  const signOut = async () => {
    try {
      setLoading(true)
      const { error } = await supabase.auth.signOut()
      if (error) {
        console.error('Error signing out:', error)
        throw error
      }
      setNeedsOnboarding(false)
      setOnboardingLoading(true)
    } catch (error) {
      console.error('Error signing out:', error)
      setLoading(false)
    }
  }

  const value = {
    user,
    session,
    loading,
    signInWithGoogle,
    connectGoogleCalendar,
    signOut,
    needsOnboarding,
    onboardingLoading,
    completeOnboarding
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
