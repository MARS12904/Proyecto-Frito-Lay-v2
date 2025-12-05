import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import { formatCurrency } from '@/lib/utils'
import { Users, Package, ShoppingCart, TrendingUp } from 'lucide-react'
import Link from 'next/link'

export default async function DashboardPage() {
  await requireAdmin()
  const supabase = createAdminServerClient()

  // Obtener métricas desde delivery_orders
  // Contar TODOS los pedidos (no cancelados)
  const ordersCountResult = await supabase
    .from('delivery_orders')
    .select('id', { count: 'exact', head: true })
    .neq('status', 'cancelled')
    .eq('is_active', true)
  
  // Obtener TODOS los pedidos para calcular ingresos (no solo completed)
  const allOrdersResult = await supabase
    .from('delivery_orders')
    .select('id, total, status')
    .neq('status', 'cancelled')
    .eq('is_active', true)
  
  // Contar pedidos completados/entregados
  const completedOrdersResult = await supabase
    .from('delivery_orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['completed', 'delivered'])
  
  // Contar pedidos pendientes
  const pendingOrdersResult = await supabase
    .from('delivery_orders')
    .select('id', { count: 'exact', head: true })
    .in('status', ['pending', 'confirmed', 'preparing', 'shipped'])
  
  const [usersResult, productsResult] = await Promise.all([
    // Total de usuarios activos (is_active = true o null)
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
  const totalOrders = ordersCountResult.count || 0
  const totalProducts = productsResult.count || 0
  const completedOrders = completedOrdersResult.count || 0
  const pendingOrders = pendingOrdersResult.count || 0
  
  // Calcular ingresos totales directamente desde la columna total de delivery_orders
  let totalRevenue = 0
  const allOrders = allOrdersResult.data || []
  
  if (allOrders.length > 0) {
    totalRevenue = allOrders.reduce((sum: number, order: any) => {
      return sum + (Number(order.total) || 0)
    }, 0)
  }

  // Obtener conteos por rol - comerciantes son los que tienen role = 'comerciante' o NULL (clientes normales)
  const { count: comerciantesCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .or('role.eq.comerciante,role.is.null')
    .neq('is_active', false)

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
      title: 'Total Pedidos',
      value: totalOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      link: '/dashboard/pedidos',
    },
    {
      title: 'Pedidos Pendientes',
      value: pendingOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-warning',
      bgColor: 'bg-warning/10',
      link: '/dashboard/pedidos?status=pending',
    },
    {
      title: 'Pedidos Completados',
      value: completedOrders.toLocaleString(),
      icon: ShoppingCart,
      color: 'text-success',
      bgColor: 'bg-success/10',
      link: '/dashboard/pedidos?status=delivered',
    },
    {
      title: 'Ingresos Totales',
      value: formatCurrency(totalRevenue),
      icon: TrendingUp,
      color: 'text-error',
      bgColor: 'bg-error/10',
      link: '/dashboard/reportes',
    },
    {
      title: 'Total Usuarios',
      value: totalUsers.toLocaleString(),
      icon: Users,
      color: 'text-secondary',
      bgColor: 'bg-secondary/10',
      link: '/dashboard/usuarios',
    },
    {
      title: 'Comerciantes',
      value: (comerciantesCount || 0).toLocaleString(),
      icon: Users,
      color: 'text-accent',
      bgColor: 'bg-accent/10',
      link: '/dashboard/usuarios?role=comerciante',
    },
    {
      title: 'Repartidores',
      value: (repartidoresCount || 0).toLocaleString(),
      icon: Users,
      color: 'text-text-secondary',
      bgColor: 'bg-text-secondary/10',
      link: '/dashboard/repartidores',
    },
    {
      title: 'Productos',
      value: totalProducts.toLocaleString(),
      icon: Package,
      color: 'text-info',
      bgColor: 'bg-info/10',
      link: '/dashboard/productos',
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

