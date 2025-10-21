'use client'

import AppLayout from '@/components/AppLayout'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    // Redirect to chat page
    router.push('/foco')
  }, [router])

  return (
    <ProtectedRoute>
      <AppLayout>
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="text-center">
            <div className="loading-shimmer w-16 h-16 rounded-full mx-auto mb-4"></div>
            <p className="text-muted-foreground">Redirigiendo a Focus Flow...</p>
          </div>
        </div>
      </AppLayout>
    </ProtectedRoute>
  )
}
