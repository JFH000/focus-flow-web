"use client"

import { useConnectedAccounts } from "@/hooks/useConnectedAccounts"
import { useAuth } from "@/contexts/AuthContext"
import { useState } from "react"

interface ConnectedAccountsManagerProps {
  isOpen: boolean
  onClose: () => void
  onAccountAdded?: () => void
}

export default function ConnectedAccountsManager({ isOpen, onClose, onAccountAdded }: ConnectedAccountsManagerProps) {
  const { accounts, removeAccount } = useConnectedAccounts()
  const { connectGoogleCalendar, loading: authLoading } = useAuth()
  const [removingAccountId, setRemovingAccountId] = useState<string | null>(null)

  const handleRemoveAccount = async (accountId: string, email: string) => {
    if (!confirm(`¿Desconectar la cuenta ${email}?`)) return

    setRemovingAccountId(accountId)
    try {
      await removeAccount(accountId)
    } catch (error) {
      console.error("Error removing account:", error)
      alert("Error al desconectar la cuenta")
    } finally {
      setRemovingAccountId(null)
    }
  }

  const handleAddGoogleAccount = async () => {
    try {
      await connectGoogleCalendar()
      onAccountAdded?.()
    } catch (error) {
      console.error("Error connecting Google account:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 md:p-4">
      <div className="bg-background rounded-lg shadow-xl w-full max-w-md max-h-[80vh] overflow-y-auto">
        <div className="p-4 md:p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg md:text-xl font-semibold">Cuentas Conectadas</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-md hover:bg-muted transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Info */}
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
            <div className="flex gap-2">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <div className="text-xs text-blue-700">
                <p className="font-medium mb-1">Múltiples cuentas</p>
                <p>Puedes conectar varias cuentas de Google para sincronizar calendarios de diferentes correos (personal, trabajo, universidad, etc.)</p>
              </div>
            </div>
          </div>

          {/* Lista de cuentas */}
          <div className="space-y-2 mb-4">
            <h3 className="text-sm font-medium text-muted-foreground">Cuentas activas:</h3>
            
            {accounts.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                No hay cuentas conectadas
              </div>
            ) : (
              <div className="space-y-2">
                {accounts.map((account) => (
                  <div
                    key={account.id}
                    className="flex items-center justify-between p-3 border border-border rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {/* Icono del proveedor */}
                      <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-red-500 flex items-center justify-center text-white font-bold">
                        G
                      </div>
                      
                      {/* Info de la cuenta */}
                      <div>
                        <div className="text-sm font-medium">{account.provider_email}</div>
                        <div className="text-xs text-muted-foreground flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full bg-green-500"></span>
                          Conectada
                        </div>
                      </div>
                    </div>

                    {/* Botón eliminar */}
                    <button
                      onClick={() => handleRemoveAccount(account.id, account.provider_email)}
                      disabled={removingAccountId === account.id}
                      className="p-2 rounded-md hover:bg-red-50 text-red-600 hover:text-red-700 transition-colors disabled:opacity-50"
                      title="Desconectar cuenta"
                    >
                      {removingAccountId === account.id ? (
                        <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Botón para añadir cuenta */}
          <button
            onClick={handleAddGoogleAccount}
            disabled={authLoading}
            className="w-full px-4 py-3 rounded-md bg-gradient-to-r from-blue-500 to-purple-500 text-white hover:from-blue-600 hover:to-purple-600 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            <span>{authLoading ? "Conectando..." : "Añadir Cuenta de Google"}</span>
          </button>

          {/* Próximamente */}
          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-muted-foreground text-center">
              Próximamente: Outlook, Apple Calendar, CalDAV
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

