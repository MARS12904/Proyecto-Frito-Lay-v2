import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import { ArrowLeft, Package, User, MapPin, Truck } from 'lucide-react'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AssignRepartidor from '@/components/dashboard/orders/AssignRepartidor'

interface PageProps {
  params: { id: string }
}

export default async function PedidoDetailPage({ params }: PageProps) {
  await requireAdmin()
  const supabase = createAdminServerClient()
  const { id } = params

  // Obtener el pedido - intentar primero con delivery_orders
  let order: any = null
  let orderError: any = null

  const deliveryOrderResult = await supabase
    .from('delivery_orders')
    .select('*')
    .eq('id', id)
    .single()

  if (deliveryOrderResult.error) {
    // Fallback a orders
    const ordersResult = await supabase
      .from('orders')
      .select('*')
      .eq('id', id)
      .single()
    order = ordersResult.data
    orderError = ordersResult.error
  } else {
    order = deliveryOrderResult.data
    // Transformar al formato esperado
    order = {
      ...order,
      user_id: order.created_by,
      total_amount: order.total,
    }
  }

  if (orderError || !order) {
    notFound()
  }

  // Obtener los items del pedido
  const { data: orderItems } = await supabase
    .from('order_items')
    .select('id, quantity, price, product_id')
    .eq('order_id', id)

  // Obtener los productos asociados
  const productIds = orderItems?.map(item => item.product_id).filter(Boolean) || []
  let products: any[] = []
  if (productIds.length > 0) {
    const { data: productsData } = await supabase
      .from('products')
      .select('id, name, brand, image, category')
      .in('id', productIds)
    products = productsData || []
  }

  // Combinar items con productos y calcular total
  const itemsWithProducts = orderItems?.map(item => ({
    ...item,
    product: products.find(p => p.id === item.product_id) || null,
    subtotal: (item.quantity || 0) * (item.price || 0),
  })) || []

  // Calcular total desde order_items
  const calculatedTotal = itemsWithProducts.reduce((sum, item) => {
    return sum + ((item.quantity || 0) * (item.price || 0))
  }, 0)

  // Obtener datos del cliente
  const { data: customer } = await supabase
    .from('user_profiles')
    .select('name, email, phone')
    .eq('id', order.user_id)
    .single()

  // Obtener dirección de entrega si es UUID
  let deliveryAddressText = order.delivery_address || ''
  if (order.delivery_address && typeof order.delivery_address === 'string' && order.delivery_address.length === 36) {
    // Es un UUID, obtener de delivery_addresses
    const { data: addressData } = await supabase
      .from('delivery_addresses')
      .select('address, zone, reference')
      .eq('id', order.delivery_address)
      .maybeSingle()
    
    if (addressData) {
      deliveryAddressText = addressData.address || order.delivery_address
      if (addressData.zone) {
        deliveryAddressText += ` (Zona: ${addressData.zone})`
      }
      if (addressData.reference) {
        deliveryAddressText += ` - ${addressData.reference}`
      }
    }
  }

  // Obtener asignación de repartidor si existe
  let assignmentData: any = null
  const { data: assignment, error: assignmentError } = await supabase
    .from('delivery_assignments')
    .select('*')
    .eq('order_id', id)
    .maybeSingle()

  if (assignment && !assignmentError && assignment.repartidor_id) {
    // Obtener el perfil del repartidor manualmente
    const { data: repartidorProfile, error: repartidorError } = await supabase
      .from('user_profiles')
      .select('id, name, email, phone')
      .eq('id', assignment.repartidor_id)
      .maybeSingle()
    
    if (!repartidorError && repartidorProfile) {
      assignmentData = {
        ...assignment,
        repartidor: repartidorProfile
      }
    } else {
      assignmentData = assignment
    }
  }

  const currentRepartidor = assignmentData?.repartidor
    ? {
        id: assignmentData.repartidor.id,
        name: assignmentData.repartidor.name,
        email: assignmentData.repartidor.email,
      }
    : null

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-warning/10 text-warning',
      confirmed: 'bg-primary/10 text-primary',
      preparing: 'bg-secondary/10 text-secondary',
      shipped: 'bg-accent/10 text-accent',
      delivered: 'bg-success/10 text-success',
      cancelled: 'bg-error/10 text-error',
    }
    return colors[status] || 'bg-text-light/10 text-text-light'
  }

  return (
    <div className="space-y-6" key={id}>
      <div className="flex items-center gap-4">
        <Link
          href="/dashboard/pedidos"
          className="inline-flex items-center gap-2 text-text-secondary hover:text-text"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Pedidos
        </Link>
      </div>

      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-text">Pedido #{id.slice(0, 8)}</h1>
            <p className="text-text-secondary mt-1">
              Creado el {formatDateTime(order.created_at)}
            </p>
          </div>
          <div className="flex flex-col gap-2 items-end">
            <span
              className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                order.status
              )}`}
            >
              {order.status}
            </span>
            {order.delivery_status && order.delivery_status !== order.status && (
              <span
                className={`inline-block px-3 py-1 rounded text-sm font-medium ${getStatusColor(
                  order.delivery_status
                )}`}
              >
                Entrega: {order.delivery_status}
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Información del Cliente */}
          <div className="bg-background rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <User className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-text">Cliente</h2>
            </div>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-text-secondary">Nombre: </span>
                <span className="text-text font-medium">{customer?.name || 'N/A'}</span>
              </div>
              <div>
                <span className="text-text-secondary">Email: </span>
                <span className="text-text">{customer?.email || 'N/A'}</span>
              </div>
              {customer?.phone && (
                <div>
                  <span className="text-text-secondary">Teléfono: </span>
                  <span className="text-text">{customer.phone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Información de Entrega */}
          <div className="bg-background rounded-lg p-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-5 h-5 text-secondary" />
              <h2 className="text-lg font-semibold text-text">Entrega</h2>
            </div>
            <div className="space-y-2 text-sm">
              {deliveryAddressText && (
                <div>
                  <span className="text-text-secondary">Dirección: </span>
                  <span className="text-text font-medium">{deliveryAddressText}</span>
                </div>
              )}
              {order.delivery_date && (
                <div>
                  <span className="text-text-secondary">Fecha: </span>
                  <span className="text-text">{order.delivery_date}</span>
                </div>
              )}
              {order.delivery_time_slot && (
                <div>
                  <span className="text-text-secondary">Horario: </span>
                  <span className="text-text">{order.delivery_time_slot}</span>
                </div>
              )}
              {order.delivery_status && (
                <div>
                  <span className="text-text-secondary">Estado de Entrega: </span>
                  <span
                    className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                      order.delivery_status
                    )}`}
                  >
                    {order.delivery_status}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Asignación de Repartidor */}
        <div className="bg-background rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 mb-3">
            <Truck className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-semibold text-text">Asignación de Repartidor</h2>
          </div>
          <AssignRepartidor
            orderId={id}
            currentRepartidor={currentRepartidor}
          />
          {assignmentData && assignmentData.status && (
            <div className="mt-3 text-sm">
              <span className="text-text-secondary">Estado de entrega: </span>
              <span
                className={`inline-block px-2 py-1 rounded text-xs font-medium ${getStatusColor(
                  assignmentData.status
                )}`}
              >
                {assignmentData.status}
              </span>
            </div>
          )}
        </div>

        {/* Notas e Indicaciones Adicionales */}
        {order.notes && (
          <div className="bg-background rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Package className="w-5 h-5 text-primary" />
              <h2 className="text-lg font-semibold text-text">Notas e Indicaciones</h2>
            </div>
            <div className="text-sm text-text whitespace-pre-wrap">
              {order.notes}
            </div>
          </div>
        )}

        {/* Productos del Pedido */}
        <div className="bg-background rounded-lg p-4">
          <div className="flex items-center gap-2 mb-4">
            <Package className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-semibold text-text">Productos</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">
                    Producto
                  </th>
                  <th className="px-4 py-2 text-center text-sm font-medium text-text-secondary">
                    Cantidad
                  </th>
                  <th className="px-4 py-2 text-left text-sm font-medium text-text-secondary">
                    Precio Unit.
                  </th>
                  <th className="px-4 py-2 text-right text-sm font-medium text-text-secondary">
                    Subtotal
                  </th>
                </tr>
              </thead>
              <tbody>
                {itemsWithProducts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-text-secondary">
                      No hay productos en este pedido
                    </td>
                  </tr>
                ) : (
                  itemsWithProducts.map((item: any) => (
                    <tr key={item.id} className="border-b border-border">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {item.product?.image && (
                            <img
                              src={item.product.image}
                              alt={item.product.name}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="text-sm font-medium text-text">
                              {item.product?.name || 'Producto eliminado'}
                            </div>
                            {item.product?.brand && (
                              <div className="text-xs text-text-secondary">
                                {item.product.brand}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-text text-center font-medium">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3 text-sm text-text">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-text text-right">
                        {formatCurrency(item.subtotal || (item.price * item.quantity))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={3} className="px-4 py-3 text-right text-sm font-medium text-text">
                    Total:
                  </td>
                  <td className="px-4 py-3 text-right text-lg font-bold text-primary">
                    {formatCurrency(calculatedTotal || order.total_amount || order.total || 0)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}


