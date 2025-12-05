import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    // Obtener pedidos
    const { data: deliveryOrders, error: ordersError } = await adminClient
      .from('delivery_orders')
      .select('*')
      .order('created_at', { ascending: false })

    if (ordersError) {
      console.error('Error fetching orders:', ordersError)
      return NextResponse.json(
        { message: 'Error al obtener pedidos', error: ordersError.message },
        { status: 500 }
      )
    }

    // Transformar datos
    const orders = deliveryOrders?.map((order: any) => ({
      id: order.id,
      user_id: order.created_by,
      status: order.status,
      delivery_status: order.delivery_status,
      total_amount: order.total || 0,
      delivery_address: order.delivery_address,
      delivery_date: order.delivery_date,
      delivery_time_slot: order.delivery_time_slot,
      payment_method: order.payment_method,
      notes: order.notes,
      created_at: order.created_at,
      updated_at: order.updated_at,
    })) || []

    // Obtener items para calcular totales
    const orderIds = orders.map((o: any) => o.id)
    
    if (orderIds.length > 0) {
      const { data: orderItems } = await adminClient
        .from('order_items')
        .select('order_id, quantity, price')
        .in('order_id', orderIds)

      // Calcular totales e items por pedido
      const totalsMap = new Map<string, { total: number; count: number }>()
      orderItems?.forEach((item: any) => {
        const current = totalsMap.get(item.order_id) || { total: 0, count: 0 }
        const quantity = Number(item.quantity) || 0
        const price = Number(item.price) || 0
        totalsMap.set(item.order_id, {
          total: current.total + (quantity * price),
          count: current.count + quantity,
        })
      })

      // Actualizar pedidos con totales calculados
      orders.forEach((order: any) => {
        const data = totalsMap.get(order.id)
        if (data) {
          order.calculatedTotal = data.total
          order.itemCount = data.count
        }
      })
    }

    return NextResponse.json(orders)
  } catch (error: any) {
    console.error('Unexpected error in GET orders:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error.message },
      { status: 500 }
    )
  }
}

