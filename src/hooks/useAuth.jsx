/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [profileLoadError, setProfileLoadError] = useState(null)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) {
      setProfile(null)
      return
    }
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle()
    if (error) {
      console.error(error)
      setProfileLoadError(error.message ?? String(error))
      setProfile(null)
      return
    }
    setProfileLoadError(null)
    setProfile(data)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session: s } }) => {
      setSession(s)
      if (s?.user?.id) setLoading(true)
      else setLoading(false)
    })
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)
      // Never set loading=true here: TOKEN_REFRESHED (e.g. after refreshSession in
      // food entry) keeps the same user id, so the profile effect does not re-run and
      // would leave loading stuck true forever.
      if (!s?.user?.id) setLoading(false)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      if (!session?.user?.id) {
        setProfile(null)
        setProfileLoadError(null)
        setLoading(false)
        return
      }
      setLoading(true)
      setProfileLoadError(null)
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
      if (cancelled) return
      if (error) {
        console.error(error)
        setProfileLoadError(error.message ?? String(error))
        setProfile(null)
      } else {
        setProfileLoadError(null)
        setProfile(data)
        if (data && data.is_active === false) {
          await supabase.auth.signOut()
          setProfile(null)
          setSession(null)
        }
      }
      setLoading(false)
    })()
    return () => {
      cancelled = true
    }
  }, [session?.user?.id])

  const signOut = useCallback(() => supabase.auth.signOut(), [])

  const refreshProfile = useCallback(async () => {
    if (session?.user?.id) await loadProfile(session.user.id)
  }, [loadProfile, session])

  return (
    <AuthContext.Provider
      value={{ session, profile, loading, profileLoadError, signOut, refreshProfile }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) {
    throw new Error('useAuth harus digunakan di dalam AuthProvider')
  }
  return ctx
}
