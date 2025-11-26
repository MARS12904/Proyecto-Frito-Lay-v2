import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

interface Params {
  params: { id: string }
}

export async function PATCH(request: Request, { params }: Params) {
  try {
    const adminClient = createAdminClient()
    const payload = await request.json()
    const { id } = params

    // Validar que el rol sea uno de los valores permitidos
    const validRoles = ['admin', 'repartidor', 'comerciante']
    const role = payload.role && validRoles.includes(payload.role) 
      ? payload.role 
      : 'comerciante' // Default a comerciante si no es válido

    const updateData: any = {
      is_active: payload.isActive !== undefined ? payload.isActive : true,
    }

    // Solo actualizar el rol si se proporciona y es válido
    if (payload.role && validRoles.includes(payload.role)) {
      updateData.role = role
    }

    const { error } = await adminClient
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)

    if (error) {
      console.error('Error updating user:', error)
      return NextResponse.json({ 
        message: 'No se pudo actualizar el usuario',
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'Usuario actualizado' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ message: 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const adminClient = createAdminClient()
    const { id } = params
    await adminClient.auth.admin.deleteUser(id)
    return NextResponse.json({ message: 'Usuario eliminado' })
  } catch (error) {
    console.error('Error deleting user:', error)
    return NextResponse.json({ message: 'Error eliminando usuario' }, { status: 500 })
  }
}



