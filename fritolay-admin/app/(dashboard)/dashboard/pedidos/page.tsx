import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

export default async function PedidosPage() {
  await requireAdmin()
  const supabase = createAdminServerClient()

  // Obtener pedidos - intentar primero con delivery_orders
  let orders = null;
  let ordersError = null;
  
  // Intentar con delivery_orders
  const deliveryOrdersResult = await supabase
    .from('delivery_orders')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (deliveryOrdersResult.error) {
    console.warn('Error with delivery_orders, falling back to orders:', deliveryOrdersResult.error)
    // Fallback a orders
    const ordersResult = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false })
    orders = ordersResult.data
    ordersError = ordersResult.error
  } else {
    // Transformar delivery_orders al formato esperado
    orders = deliveryOrdersResult.data?.map((order: any) => ({
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
    console.log(`Loaded ${orders.length} orders from delivery_orders`)
  }

  if (ordersError) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text mb-4">Pedidos</h1>
        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
          Error al cargar pedidos: {ordersError.message}
        </div>
      </div>
    )
  }

  // Obtener todos los order_items para calcular totales correctos
  const orderIds = orders?.map(o => o.id) || []
  const { data: allOrderItems, error: orderItemsError } = orderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, quantity, price')
        .in('order_id', orderIds)
    : { data: [], error: null }
  
  if (orderItemsError) {
    console.error('Error loading order items:', orderItemsError)
  }

  // Calcular totales por pedido
  const orderTotals = new Map<string, number>()
  const orderItemCounts = new Map<string, number>()
  
  allOrderItems?.forEach(item => {
    const currentTotal = orderTotals.get(item.order_id) || 0
    const quantity = Number(item.quantity) || 0
    const price = Number(item.price) || 0
    const itemTotal = quantity * price
    orderTotals.set(item.order_id, currentTotal + itemTotal)
    
    const currentCount = orderItemCounts.get(item.order_id) || 0
    orderItemCounts.set(item.order_id, currentCount + quantity)
  })

  // Obtener usuarios para mapear user_id a nombres
  const userIds = orders?.map((o: any) => o.user_id || o.created_by).filter(Boolean) || []
  const { data: customers } = await supabase
    .from('user_profiles')
    .select('id, name, email')
    .in('id', userIds)

  const customerMap = new Map(customers?.map((c) => [c.id, c]) || [])

  // Obtener asignaciones de repartidores para los pedidos
  let assignmentMap = new Map()
  
  if (orderIds.length > 0) {
    const { data: assignments, error: assignmentsError } = await supabase
      .from('delivery_assignments')
      .select('order_id, repartidor_id')
      .in('order_id', orderIds)

    if (!assignmentsError && assignments && assignments.length > 0) {
      // Obtener IDs de repartidores únicos
      const repartidorIds = assignments
        .map((a: any) => a.repartidor_id)
        .filter(Boolean)
        .filter((id: string, index: number, self: string[]) => self.indexOf(id) === index)

      // Obtener perfiles de repartidores
      if (repartidorIds.length > 0) {
        const { data: repartidores } = await supabase
          .from('user_profiles')
          .select('id, name, email')
          .in('id', repartidorIds)

        const repartidorMap = new Map(
          repartidores?.map((r: any) => [r.id, r]) || []
        )

        // Crear mapa de asignaciones
        assignments.forEach((assignment: any) => {
          const repartidor = repartidorMap.get(assignment.repartidor_id)
          if (repartidor) {
            assignmentMap.set(assignment.order_id, repartidor)
          }
        })
      }
    }
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-text mb-6">Pedidos</h1>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  ID
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Cliente
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Repartidor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Fecha
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!orders || orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                    No hay pedidos registrados
                  </td>
                </tr>
              ) : (
                orders.map((order: any) => {
                  const customer = customerMap.get(order.user_id)
                  const assignment = assignmentMap.get(order.id)
                  return (
                    <tr key={order.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-text font-mono text-sm">
                        {order.id.slice(0, 8)}...
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-text">
                        {customer?.name || 'N/A'}
                        <br />
                        <span className="text-xs text-text-secondary">{customer?.email}</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-text font-bold text-lg">
                          {formatCurrency(orderTotals.get(order.id) || order.total_amount || 0)}
                        </div>
                        <div className="text-xs text-text-secondary mt-1">
                          {orderItemCounts.get(order.id) || 0} {orderItemCounts.get(order.id) === 1 ? 'item' : 'items'}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <span
                            className={`px-2 py-1 text-xs rounded ${
                              order.status === 'completed' || order.status === 'delivered'
                                ? 'bg-success/10 text-success'
                                : order.status === 'pending'
                                ? 'bg-warning/10 text-warning'
                                : 'bg-error/10 text-error'
                            }`}
                          >
                            {order.status}
                          </span>
                          {order.delivery_status && order.delivery_status !== order.status && (
                            <div>
                              <span
                                className={`px-2 py-1 text-xs rounded ${
                                  order.delivery_status === 'assigned'
                                    ? 'bg-info/10 text-info'
                                    : order.delivery_status === 'in_transit'
                                    ? 'bg-accent/10 text-accent'
                                    : order.delivery_status === 'delivered'
                                    ? 'bg-success/10 text-success'
                                    : 'bg-warning/10 text-warning'
                                }`}
                              >
                                Entrega: {order.delivery_status}
                              </span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-text text-sm">
                        {assignment?.name ? (
                          <span className="text-text">{assignment.name}</span>
                        ) : (
                          <span className="text-text-secondary italic">Sin asignar</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-text text-sm">
                        {formatDateTime(order.created_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/pedidos/${order.id}`}
                          className="text-primary hover:text-primary-dark text-sm font-medium"
                        >
                          Ver
                        </Link>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

