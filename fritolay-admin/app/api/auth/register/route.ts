import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()
    const { email, password, name } = body

    console.log('Registration attempt:', { email, name: name ? 'provided' : 'missing' })

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedName = name.trim()

    // Verificar si el email ya existe en auth.users primero
    try {
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const existingAuthUser = authUsers.users.find(u => u.email === normalizedEmail)
      
      if (existingAuthUser) {
        // Verificar si ya tiene perfil
        const { data: existingProfile } = await adminClient
          .from('user_profiles')
          .select('id, email, role')
          .eq('id', existingAuthUser.id)
          .single()

        if (existingProfile) {
          return NextResponse.json(
            { message: 'Este email ya está registrado' },
            { status: 400 }
          )
        }
      }
    } catch (checkError) {
      console.error('Error checking existing user:', checkError)
      // Continuar con el registro si hay error en la verificación
    }

    // Crear usuario en Supabase Auth
    console.log('Creating auth user...')
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: normalizedName,
        role: 'admin',
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { 
          message: 'Error al crear usuario: ' + authError.message,
          error: authError.message,
          code: authError.status,
        },
        { status: 500 }
      )
    }

    if (!authData.user) {
      console.error('No user data returned from auth')
      return NextResponse.json(
        { message: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    console.log('Auth user created:', authData.user.id)

    // Crear perfil de usuario con todos los campos posibles
    const profileData: any = {
      id: authData.user.id,
      email: normalizedEmail,
      name: normalizedName,
      role: 'admin',
      is_active: true,
      preferences: { notifications: true, theme: 'auto' },
    }

    // Intentar insertar el perfil
    console.log('Creating user profile...', { userId: authData.user.id })
    const { data: profileDataResult, error: profileError } = await adminClient
      .from('user_profiles')
      .insert(profileData)
      .select()
      .single()

    if (profileError) {
      console.error('Error creating profile:', {
        error: profileError,
        message: profileError.message,
        details: profileError.details,
        hint: profileError.hint,
        code: profileError.code,
      })

      // Intentar eliminar el usuario de auth si falla la creación del perfil
      try {
        await adminClient.auth.admin.deleteUser(authData.user.id)
        console.log('Auth user deleted after profile creation failure')
      } catch (deleteError) {
        console.error('Error deleting auth user:', deleteError)
      }

      return NextResponse.json(
        { 
          message: 'Error al crear perfil: ' + profileError.message,
          error: profileError.message,
          details: profileError.details,
          hint: profileError.hint,
          code: profileError.code,
        },
        { status: 500 }
      )
    }

    console.log('Profile created successfully:', profileDataResult?.id)

    return NextResponse.json(
      { 
        message: 'Administrador creado exitosamente', 
        userId: authData.user.id,
        profileId: profileDataResult?.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Unexpected error in registration:', {
      error,
      message: error?.message,
      stack: error?.stack,
    })
    return NextResponse.json(
      { 
        message: 'Error inesperado: ' + (error?.message || 'Error desconocido'),
        error: error?.message,
      },
      { status: 500 }
    )
  }
}


