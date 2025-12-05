import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()
    const { email, password, name, phone, license_number } = body

    console.log('Repartidor registration attempt:', { email, name })

    if (!email || !password || !name) {
      return NextResponse.json(
        { message: 'Email, contraseña y nombre son requeridos' },
        { status: 400 }
      )
    }

    const normalizedEmail = email.toLowerCase().trim()
    const normalizedName = name.trim()

    // Verificar si el email ya existe
    try {
      const { data: authUsers } = await adminClient.auth.admin.listUsers()
      const existingAuthUser = authUsers.users.find(u => u.email === normalizedEmail)
      
      if (existingAuthUser) {
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
    }

    // Crear usuario en Supabase Auth
    console.log('Creating auth user for repartidor...')
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: {
        name: normalizedName,
        role: 'repartidor',
      },
    })

    if (authError) {
      console.error('Error creating auth user:', authError)
      return NextResponse.json(
        { 
          message: 'Error al crear usuario: ' + authError.message,
          error: authError.message,
        },
        { status: 500 }
      )
    }

    if (!authData.user) {
      return NextResponse.json(
        { message: 'No se pudo crear el usuario' },
        { status: 500 }
      )
    }

    console.log('Auth user created:', authData.user.id)

    // Crear o actualizar perfil de repartidor
    // Usamos upsert porque puede existir un trigger que crea el perfil automáticamente
    const profileData: any = {
      id: authData.user.id,
      email: normalizedEmail,
      name: normalizedName,
      role: 'repartidor',
      is_active: true,
      phone: phone || null,
      license_number: license_number || null,
      phone_verified: false,
      preferences: { notifications: true, theme: 'auto' },
    }

    console.log('Creating/updating repartidor profile...')
    
    // Primero intentar actualizar si ya existe (por trigger)
    const { data: existingProfile } = await adminClient
      .from('user_profiles')
      .select('id')
      .eq('id', authData.user.id)
      .single()

    let profileDataResult
    let profileError

    if (existingProfile) {
      // El perfil ya existe (creado por trigger), actualizarlo
      console.log('Profile exists (from trigger), updating...')
      const { data, error } = await adminClient
        .from('user_profiles')
        .update({
          email: normalizedEmail,
          name: normalizedName,
          role: 'repartidor',
          is_active: true,
          phone: phone || null,
          license_number: license_number || null,
          phone_verified: false,
          preferences: { notifications: true, theme: 'auto' },
        })
        .eq('id', authData.user.id)
        .select()
        .single()
      
      profileDataResult = data
      profileError = error
    } else {
      // El perfil no existe, crearlo
      console.log('Profile does not exist, creating...')
      const { data, error } = await adminClient
        .from('user_profiles')
        .insert(profileData)
        .select()
        .single()
      
      profileDataResult = data
      profileError = error
    }

    if (profileError) {
      console.error('Error creating/updating profile:', profileError)
      
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
        },
        { status: 500 }
      )
    }

    console.log('Repartidor profile created successfully:', profileDataResult?.id)

    return NextResponse.json(
      { 
        message: 'Repartidor creado exitosamente', 
        userId: authData.user.id,
        profileId: profileDataResult?.id,
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error('Unexpected error in repartidor registration:', error)
    return NextResponse.json(
      { 
        message: 'Error inesperado: ' + (error?.message || 'Error desconocido'),
        error: error?.message,
      },
      { status: 500 }
    )
  }
}


