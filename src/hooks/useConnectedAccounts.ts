"use client"

import { createClient } from "@/lib/supabase/client"
import type { ConnectedAccount, ConnectedAccountInsert } from "@/types/database"
import { useCallback, useEffect, useState } from "react"

interface UseConnectedAccountsReturn {
  accounts: ConnectedAccount[]
  loading: boolean
  error: string | null
  addAccount: (account: Omit<ConnectedAccountInsert, "user_id">) => Promise<ConnectedAccount>
  removeAccount: (accountId: string) => Promise<void>
  updateAccountToken: (accountId: string, accessToken: string, expiresAt: string) => Promise<void>
  getAccountByEmail: (provider: string, email: string) => ConnectedAccount | null
  refreshAccounts: () => Promise<void>
}

export function useConnectedAccounts(): UseConnectedAccountsReturn {
  const [accounts, setAccounts] = useState<ConnectedAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchAccounts = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        setAccounts([])
        return
      }

      const { data, error: fetchError } = await supabase
        .from("connected_accounts")
        .select("*")
        .eq("user_id", user.id)
        .eq("is_active", true)
        .order("created_at", { ascending: true })

      if (fetchError) {
        throw fetchError
      }

      setAccounts(data || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Error al cargar cuentas"
      setError(errorMessage)
      console.error("Error fetching connected accounts:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  const addAccount = useCallback(
    async (accountData: Omit<ConnectedAccountInsert, "user_id">): Promise<ConnectedAccount> => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          throw new Error("Usuario no autenticado")
        }

        const { data, error: insertError } = await supabase
          .from("connected_accounts")
          .insert({
            ...accountData,
            user_id: user.id,
          })
          .select()
          .single()

        if (insertError) {
          throw insertError
        }

        await fetchAccounts()
        return data
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al añadir cuenta"
        setError(errorMessage)
        console.error("Error adding connected account:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchAccounts],
  )

  const removeAccount = useCallback(
    async (accountId: string) => {
      setLoading(true)
      setError(null)

      try {
        const supabase = createClient()
        const { error: deleteError } = await supabase
          .from("connected_accounts")
          .update({ is_active: false })
          .eq("id", accountId)

        if (deleteError) {
          throw deleteError
        }

        await fetchAccounts()
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "Error al eliminar cuenta"
        setError(errorMessage)
        console.error("Error removing connected account:", err)
        throw err
      } finally {
        setLoading(false)
      }
    },
    [fetchAccounts],
  )

  const updateAccountToken = useCallback(async (accountId: string, accessToken: string, expiresAt: string) => {
    try {
      const supabase = createClient()
      const { error: updateError } = await supabase
        .from("connected_accounts")
        .update({
          access_token: accessToken,
          token_expires_at: expiresAt,
          updated_at: new Date().toISOString(),
        })
        .eq("id", accountId)

      if (updateError) {
        throw updateError
      }

      await fetchAccounts()
    } catch (err) {
      console.error("Error updating account token:", err)
      throw err
    }
  }, [fetchAccounts])

  const getAccountByEmail = useCallback(
    (provider: string, email: string): ConnectedAccount | null => {
      return accounts.find((acc) => acc.provider === provider && acc.provider_email === email) || null
    },
    [accounts],
  )

  return {
    accounts,
    loading,
    error,
    addAccount,
    removeAccount,
    updateAccountToken,
    getAccountByEmail,
    refreshAccounts: fetchAccounts,
  }
}

