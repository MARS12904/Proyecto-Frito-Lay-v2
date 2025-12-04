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

    const updateData: any = {}

    if (payload.name !== undefined) updateData.name = payload.name.trim()
    if (payload.phone !== undefined) updateData.phone = payload.phone || null
    if (payload.license_number !== undefined) updateData.license_number = payload.license_number || null
    if (payload.is_active !== undefined) updateData.is_active = payload.is_active
    if (payload.phone_verified !== undefined) updateData.phone_verified = payload.phone_verified

    const { error } = await adminClient
      .from('user_profiles')
      .update(updateData)
      .eq('id', id)
      .eq('role', 'repartidor')

    if (error) {
      console.error('Error updating repartidor:', error)
      return NextResponse.json({ 
        message: 'No se pudo actualizar el repartidor',
        error: error.message 
      }, { status: 500 })
    }

    return NextResponse.json({ message: 'Repartidor actualizado exitosamente' })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ message: 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(request: Request, { params }: Params) {
  try {
    const adminClient = createAdminClient()
    const { id } = params

    // Verificar que sea un repartidor
    const { data: profile } = await adminClient
      .from('user_profiles')
      .select('role')
      .eq('id', id)
      .single()

    if (!profile || profile.role !== 'repartidor') {
      return NextResponse.json(
        { message: 'Usuario no encontrado o no es un repartidor' },
        { status: 404 }
      )
    }

    // Eliminar de auth
    await adminClient.auth.admin.deleteUser(id)

    return NextResponse.json({ message: 'Repartidor eliminado exitosamente' })
  } catch (error: any) {
    console.error('Error deleting repartidor:', error)
    return NextResponse.json(
      { message: 'Error eliminando repartidor: ' + (error?.message || 'Error desconocido') },
      { status: 500 }
    )
  }
}


