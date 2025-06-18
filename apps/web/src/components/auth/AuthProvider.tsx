"use client";

import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { User } from '@supabase/supabase-js'

interface AuthResult {
  error?: string
  success?: boolean
  user?: User | null
  needsConfirmation?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  signIn: (email: string, password: string) => Promise<AuthResult>
  signUp: (email: string, password: string) => Promise<AuthResult>
  signOut: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  // Helper function to ensure user profile exists
  const ensureUserProfile = async (user: User) => {
    try {
      // Check if user profile exists
      const { data: _, error } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single()

      if (error && error.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating missing user profile for user:', user.id)
        
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            email: user.email!,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || user.email!.split('@')[0],
            avatar_url: user.user_metadata?.avatar_url,
            role: 'user',
            preferred_model_provider: 'openai',
            preferred_model_name: 'gpt-4o-mini',
            preferred_language: 'en',
            base_theme: 'system',
            color_theme: 'default',
            font_family: 'sans'
          })

        if (insertError) {
          console.error('Failed to create user profile:', insertError)
        } else {
          console.log('Successfully created user profile')
        }
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error)
    }
  }

  useEffect(() => {
    // Get initial user
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      
      if (user) {
        await ensureUserProfile(user)
      }
      
      setUser(user)
      setLoading(false)
    }

    getUser()

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        const user = session?.user ?? null
        
        if (user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED')) {
          await ensureUserProfile(user)
        }
        
        setUser(user)
        setLoading(false)
      }
    )

    return () => subscription.unsubscribe()
  }, [supabase.auth])

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })
    
    if (error) {
      return { error: error.message }
    }
    
    return { success: true, user: data.user }
  }

  const signUp = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })
    
    if (error) {
      return { error: error.message }
    }
    
    // Return success info including whether email confirmation is needed
    return { 
      success: true,
      needsConfirmation: !data.user?.email_confirmed_at,
      user: data.user 
    }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      signIn,
      signUp,
      signOut,
    }}>
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