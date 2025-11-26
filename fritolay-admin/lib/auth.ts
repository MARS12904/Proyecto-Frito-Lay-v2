import { redirect } from 'next/navigation'
import { createServerSupabase } from './supabase/server'

export async function requireAdmin() {
  const supabase = await createServerSupabase()

  const {
    data: { session },
    error: sessionError,
  } = await supabase.auth.getSession()

  if (sessionError || !session) {
    console.log('No session found, redirecting to login')
    redirect('/login')
  }

  // Verificar que el usuario tenga rol de admin
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('role, is_active')
    .eq('id', session.user.id)
    .single()

  if (profileError) {
    console.error('Error fetching profile:', profileError)
    redirect('/login')
  }

  if (!profile || profile.role !== 'admin' || !profile.is_active) {
    console.log('User is not admin or not active:', { 
      role: profile?.role, 
      is_active: profile?.is_active 
    })
    redirect('/login')
  }

  return { session, profile }
}

