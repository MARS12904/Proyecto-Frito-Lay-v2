import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import { formatCurrency } from '@/lib/utils'
import { Users, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  await requireAdmin()
  const supabase = createAdminServerClient()

  // Obtener métricas
  // Intentar usar delivery_orders primero, luego fallback a orders
  let ordersResult, completedOrdersResult;
  
  // Intentar con delivery_orders
  const deliveryOrdersCountResult = await supabase
    .from('delivery_orders')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'cancelled')
  
  const deliveryCompletedOrdersResult = await supabase
    .from('delivery_orders')
    .select('id')
    .in('status', ['completed', 'delivered'])
    .neq('status', 'cancelled')
  
  if (deliveryOrdersCountResult.error || deliveryCompletedOrdersResult.error) {
    console.warn('Error with delivery_orders, falling back to orders:', {
      countError: deliveryOrdersCountResult.error,
      completedError: deliveryCompletedOrdersResult.error
    })
    // Fallback a orders
    ordersResult = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .neq('status', 'cancelled')
    
    completedOrdersResult = await supabase
      .from('orders')
      .select('id')
      .in('status', ['completed', 'delivered'])
      .neq('status', 'cancelled')
  } else {
    ordersResult = deliveryOrdersCountResult
    completedOrdersResult = deliveryCompletedOrdersResult
    console.log('Using delivery_orders for dashboard metrics')
  }
  
  const [usersResult, productsResult] = await Promise.all([
    // Total de usuarios activos
    supabase
      .from('user_profiles')
      .select('id', { count: 'exact', head: true })
      .or('is_active.eq.true,is_active.is.null'),
    
    // Total de productos
    supabase
      .from('products')
      .select('id', { count: 'exact', head: true }),
  ])

  const totalUsers = usersResult.count || 0
  const totalOrders = ordersResult.count || 0
  const totalProducts = productsResult.count || 0
  
  // Calcular ingresos totales desde order_items
  const completedOrderIds = completedOrdersResult.data?.map((o: any) => o.id) || []
  let totalRevenue = 0
  
  if (completedOrderIds.length > 0) {
    console.log(`Calculating revenue for ${completedOrderIds.length} completed orders`)
    
    // Intentar primero con 'price', luego con 'unit_price'
    let orderItems = null
    let itemsError = null
    
    const itemsResultWithPrice = await supabase
      .from('order_items')
      .select('quantity, price, unit_price')
      .in('order_id', completedOrderIds)
    
    if (itemsResultWithPrice.error) {
      console.warn('Error loading order items with price column:', itemsResultWithPrice.error)
      // Intentar solo con unit_price
      const itemsResultWithUnitPrice = await supabase
        .from('order_items')
        .select('quantity, unit_price')
        .in('order_id', completedOrderIds)
      
      if (itemsResultWithUnitPrice.error) {
        console.error('Error loading order items for revenue:', itemsResultWithUnitPrice.error)
        itemsError = itemsResultWithUnitPrice.error
      } else {
        orderItems = itemsResultWithUnitPrice.data
      }
    } else {
      orderItems = itemsResultWithPrice.data
    }
    
    if (orderItems && !itemsError) {
      totalRevenue = orderItems.reduce((sum: number, item: any) => {
        const quantity = Number(item.quantity) || 0
        const price = Number(item.price || item.unit_price) || 0
        return sum + (quantity * price)
      }, 0)
      console.log(`Total revenue calculated: ${totalRevenue} from ${orderItems.length} items`)
    }
  }

  // Obtener conteos por rol
  const { count: comerciantesCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .or('role.eq.comerciante,role.is.null')
    .or('is_active.eq.true,is_active.is.null')

  const { count: repartidoresCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'repartidor')
    .eq('is_active', true)

  const { count: adminsCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('role', 'admin')
    .eq('is_active', true)

  const stats = [
    {
      title: 'Total Usuarios',
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/dashboard/usuarios',
    },
    {
      title: 'Comerciantes',
      value: (comerciantesCount || 0).toLocaleString(),
      icon: Users,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      link: '/dashboard/usuarios?role=comerciante',
    },
    {
      title: 'Repartidores',
      value: (repartidoresCount || 0).toLocaleString(),
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      link: '/dashboard/repartidores',
    },
    {
      title: 'Total Pedidos',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/dashboard/pedidos',
    },
    {
      title: 'Productos',
      value: totalProducts.toLocaleString(),
      icon: Package,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      link: '/dashboard/productos',
    },
    {
      title: 'Ingresos Totales',
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: 'text-error',
      bgColor: 'bg-error/10',
      link: '/dashboard/reportes',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-text">Dashboard</h1>
        <p className="text-text-secondary mt-2">Bienvenido al panel de administración</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <Link
              key={stat.title}
              href={stat.link}
              className="bg-card rounded-lg shadow-sm border border-border p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <p className="text-text-secondary text-sm mb-1">{stat.title}</p>
                  <p className="text-2xl font-bold text-text">{stat.value}</p>
                </div>
                <div className={`${stat.bgColor} ${stat.color} p-3 rounded-lg`}>
                  <Icon className="w-6 h-6" />
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

