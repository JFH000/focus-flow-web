import Link from 'next/link'

export default function AuthCodeError() {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-card p-8 rounded-lg border shadow-lg text-center">
          <div className="mb-6">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-card-foreground mb-2">
              Error de Autenticación
            </h1>
            <p className="text-muted-foreground">
              Hubo un problema al procesar tu inicio de sesión. Por favor, intenta nuevamente.
            </p>
          </div>

          <div className="space-y-4">
            <Link
              href="/login"
              className="w-full inline-block bg-primary text-primary-foreground px-6 py-3 rounded-lg font-medium hover:opacity-90 transition-opacity"
            >
              Intentar Nuevamente
            </Link>
            <Link
              href="/"
              className="w-full inline-block border border-border text-foreground px-6 py-3 rounded-lg font-medium hover:bg-muted transition-colors"
            >
              Volver al Inicio
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


