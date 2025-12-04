import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(request: Request) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()
    const { order_id, repartidor_id } = body

    if (!order_id || !repartidor_id) {
      return NextResponse.json(
        { message: 'order_id y repartidor_id son requeridos' },
        { status: 400 }
      )
    }

    // Verificar que el pedido existe
    const { data: order, error: orderError } = await adminClient
      .from('delivery_orders')
      .select('id, delivery_status')
      .eq('id', order_id)
      .single()

    if (orderError || !order) {
      return NextResponse.json(
        { message: 'Pedido no encontrado' },
        { status: 404 }
      )
    }

    // Verificar que el repartidor existe y tiene rol correcto
    const { data: repartidor, error: repartidorError } = await adminClient
      .from('user_profiles')
      .select('id, role, is_active')
      .eq('id', repartidor_id)
      .single()

    if (repartidorError || !repartidor) {
      return NextResponse.json(
        { message: 'Repartidor no encontrado' },
        { status: 404 }
      )
    }

    if (repartidor.role !== 'repartidor') {
      return NextResponse.json(
        { message: 'El usuario no es un repartidor' },
        { status: 400 }
      )
    }

    if (!repartidor.is_active) {
      return NextResponse.json(
        { message: 'El repartidor está inactivo' },
        { status: 400 }
      )
    }

    // Verificar si ya existe una asignación para este pedido
    const { data: existingAssignment } = await adminClient
      .from('delivery_assignments')
      .select('id, repartidor_id')
      .eq('order_id', order_id)
      .maybeSingle()

    if (existingAssignment) {
      // Actualizar la asignación existente
      const { error: updateError } = await adminClient
        .from('delivery_assignments')
        .update({
          repartidor_id: repartidor_id,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingAssignment.id)

      if (updateError) {
        console.error('Error updating assignment:', updateError)
        return NextResponse.json(
          { message: 'Error al actualizar la asignación', error: updateError.message },
          { status: 500 }
        )
      }
    } else {
      // Crear nueva asignación
      const { error: insertError } = await adminClient
        .from('delivery_assignments')
        .insert({
          order_id: order_id,
          repartidor_id: repartidor_id,
          assigned_at: new Date().toISOString(),
          status: 'assigned',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })

      if (insertError) {
        console.error('Error creating assignment:', insertError)
        return NextResponse.json(
          { message: 'Error al crear la asignación', error: insertError.message },
          { status: 500 }
        )
      }
    }

    // Actualizar el estado de la orden
    const { error: orderUpdateError } = await adminClient
      .from('delivery_orders')
      .update({
        delivery_status: 'assigned',
        assigned_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    if (orderUpdateError) {
      console.error('Error updating order:', orderUpdateError)
      // No fallar si esto falla, la asignación ya se creó
    }

    return NextResponse.json(
      { 
        message: 'Pedido asignado exitosamente',
        order_id,
        repartidor_id,
      },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Unexpected error in order assignment:', error)
    return NextResponse.json(
      { 
        message: 'Error inesperado: ' + (error?.message || 'Error desconocido'),
        error: error?.message,
      },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)
    const order_id = searchParams.get('order_id')

    if (!order_id) {
      return NextResponse.json(
        { message: 'order_id es requerido' },
        { status: 400 }
      )
    }

    // Eliminar la asignación
    const { error: deleteError } = await adminClient
      .from('delivery_assignments')
      .delete()
      .eq('order_id', order_id)

    if (deleteError) {
      console.error('Error deleting assignment:', deleteError)
      return NextResponse.json(
        { message: 'Error al eliminar la asignación', error: deleteError.message },
        { status: 500 }
      )
    }

    // Actualizar el estado de la orden
    await adminClient
      .from('delivery_orders')
      .update({
        delivery_status: 'pending',
        assigned_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', order_id)

    return NextResponse.json(
      { message: 'Asignación eliminada exitosamente' },
      { status: 200 }
    )
  } catch (error: any) {
    console.error('Unexpected error in assignment deletion:', error)
    return NextResponse.json(
      { 
        message: 'Error inesperado: ' + (error?.message || 'Error desconocido'),
        error: error?.message,
      },
      { status: 500 }
    )
  }
}

