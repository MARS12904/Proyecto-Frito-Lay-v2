import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import { formatCurrency, formatDate } from '@/lib/utils'
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Users, Package, Calendar } from 'lucide-react'
import ReportsCharts from '@/components/dashboard/reports/ReportsCharts'
import ReportFilters from '@/components/dashboard/reports/ReportFilters'
import { Suspense } from 'react'

interface ReportPageProps {
  searchParams: Promise<{
    period?: 'week' | 'month' | 'year'
    compare?: 'true' | 'false'
  }>
}

export default async function ReportesPage({ searchParams }: ReportPageProps) {
  const params = await searchParams
  await requireAdmin()
  const supabase = createAdminServerClient()

  const periodType = params.period || 'month'
  const comparePeriods = params.compare === 'true'

  // Calcular fechas según el período
  const now = new Date()
  const getPeriodDates = (type: 'week' | 'month' | 'year', offset: number = 0) => {
    const start = new Date()
    const end = new Date()

    if (type === 'week') {
      start.setDate(now.getDate() - (7 * (offset + 1)) - (now.getDay() || 7) + 1)
      end.setDate(start.getDate() + 6)
    } else if (type === 'month') {
      start.setMonth(now.getMonth() - offset)
      start.setDate(1)
      end.setMonth(now.getMonth() - offset + 1)
      end.setDate(0)
    } else {
      start.setFullYear(now.getFullYear() - offset)
      start.setMonth(0)
      start.setDate(1)
      end.setFullYear(now.getFullYear() - offset)
      end.setMonth(11)
      end.setDate(31)
    }

    return { start, end }
  }

  const currentPeriod = getPeriodDates(periodType, 0)
  const previousPeriod = comparePeriods ? getPeriodDates(periodType, 1) : null

  // Obtener pedidos del período actual
  const { data: currentOrders } = await supabase
    .from('orders')
    .select('id, total_amount, created_at, status')
    .gte('created_at', currentPeriod.start.toISOString())
    .lte('created_at', currentPeriod.end.toISOString())

  // Obtener pedidos del período anterior si se requiere comparación
  let previousOrders: any[] = []
  if (previousPeriod) {
    const { data } = await supabase
      .from('orders')
      .select('id, total_amount, created_at, status')
      .gte('created_at', previousPeriod.start.toISOString())
      .lte('created_at', previousPeriod.end.toISOString())
    previousOrders = data || []
  }

  // Obtener order_items para calcular totales correctos
  const currentOrderIds = (currentOrders || []).map(o => o.id)
  const previousOrderIds = previousOrders.map(o => o.id)
  
  const { data: currentOrderItems } = currentOrderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, quantity, price')
        .in('order_id', currentOrderIds)
    : { data: [] }
  
  const { data: previousOrderItems } = previousOrderIds.length > 0
    ? await supabase
        .from('order_items')
        .select('order_id, quantity, price')
        .in('order_id', previousOrderIds)
    : { data: [] }

  // Procesar datos para gráficas con cálculo correcto desde order_items
  const processDataForChart = (
    orders: any[], 
    orderItems: any[],
    period: { start: Date; end: Date }, 
    type: 'week' | 'month' | 'year'
  ) => {
    const data: { [key: string]: number } = {}

    if (type === 'week') {
      for (let i = 0; i < 7; i++) {
        const date = new Date(period.start)
        date.setDate(date.getDate() + i)
        const key = date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
        data[key] = 0
      }
    } else if (type === 'month') {
      const daysInMonth = new Date(period.end.getFullYear(), period.end.getMonth() + 1, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${i}`
        data[key] = 0
      }
    } else {
      for (let i = 1; i <= 12; i++) {
        const monthName = new Date(2000, i - 1).toLocaleDateString('es-PE', { month: 'short' })
        data[monthName] = 0
      }
    }

    // Crear mapa de totales por pedido desde order_items
    const orderTotalsMap = new Map<string, number>()
    orderItems.forEach(item => {
      const current = orderTotalsMap.get(item.order_id) || 0
      const quantity = Number(item.quantity) || 0
      const price = Number(item.price) || 0
      orderTotalsMap.set(item.order_id, current + (quantity * price))
    })

    // Agrupar por fecha
    orders.forEach(order => {
      if (order.status === 'completed') {
        const date = new Date(order.created_at)
        let key: string

        if (type === 'week') {
          key = date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
        } else if (type === 'month') {
          key = `${date.getDate()}`
        } else {
          key = date.toLocaleDateString('es-PE', { month: 'short' })
        }

        if (data[key] !== undefined) {
          // Usar total calculado desde order_items o fallback a total_amount
          const orderTotal = orderTotalsMap.get(order.id) || order.total_amount || 0
          data[key] += orderTotal
        }
      }
    })

    return Object.entries(data).map(([period, revenue]) => ({
      period,
      current: revenue,
    }))
  }

  const revenueData = processDataForChart(
    currentOrders || [], 
    currentOrderItems || [],
    currentPeriod, 
    periodType
  )
  const previousRevenueData = previousPeriod 
    ? processDataForChart(previousOrders, previousOrderItems || [], previousPeriod, periodType)
    : []

  // Combinar datos para comparación
  const combinedRevenueData = revenueData.map((item, index) => ({
    ...item,
    previous: previousRevenueData[index]?.current || undefined,
  }))

  // Procesar datos de pedidos
  const processOrdersData = (orders: any[], period: { start: Date; end: Date }, type: 'week' | 'month' | 'year') => {
    const data: { [key: string]: number } = {}

    if (type === 'week') {
      for (let i = 0; i < 7; i++) {
        const date = new Date(period.start)
        date.setDate(date.getDate() + i)
        const key = date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
        data[key] = 0
      }
    } else if (type === 'month') {
      const daysInMonth = new Date(period.end.getFullYear(), period.end.getMonth() + 1, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${i}`
        data[key] = 0
      }
    } else {
      for (let i = 1; i <= 12; i++) {
        const monthName = new Date(2000, i - 1).toLocaleDateString('es-PE', { month: 'short' })
        data[monthName] = 0
      }
    }

    orders.forEach(order => {
      const date = new Date(order.created_at)
      let key: string

      if (type === 'week') {
        key = date.toLocaleDateString('es-PE', { weekday: 'short', day: 'numeric' })
      } else if (type === 'month') {
        key = `${date.getDate()}`
      } else {
        key = date.toLocaleDateString('es-PE', { month: 'short' })
      }

      if (data[key] !== undefined) {
        data[key] += 1
      }
    })

    return Object.entries(data).map(([period, count]) => ({
      period,
      current: count,
    }))
  }

  const ordersData = processOrdersData(currentOrders || [], currentPeriod, periodType)
  const previousOrdersData = previousPeriod 
    ? processOrdersData(previousOrders, previousPeriod, periodType)
    : []

  const combinedOrdersData = ordersData.map((item, index) => ({
    ...item,
    previous: previousOrdersData[index]?.current || undefined,
  }))

  // Calcular totales desde order_items
  const calculateRevenueFromItems = (orders: any[], orderItems: any[]) => {
    const completedOrderIds = new Set(
      orders.filter(o => o.status === 'completed').map(o => o.id)
    )
    
    return orderItems
      .filter(item => completedOrderIds.has(item.order_id))
      .reduce((sum, item) => {
        const quantity = Number(item.quantity) || 0
        const price = Number(item.price) || 0
        return sum + (quantity * price)
      }, 0)
  }

  const currentRevenue = calculateRevenueFromItems(currentOrders || [], currentOrderItems || [])
  const previousRevenue = calculateRevenueFromItems(previousOrders, previousOrderItems || [])

  const revenueGrowth = previousRevenue > 0 
    ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
    : 0

  const currentOrdersCount = (currentOrders || []).length
  const previousOrdersCount = previousOrders.length
  const ordersGrowth = previousOrdersCount > 0
    ? ((currentOrdersCount - previousOrdersCount) / previousOrdersCount) * 100
    : 0

  // Obtener otras estadísticas
  const { data: allUsers } = await supabase
    .from('user_profiles')
    .select('id, role, is_active')
    .or('is_active.eq.true,is_active.is.null')

  const { data: allProducts } = await supabase
    .from('products')
    .select('id, stock')

  const lowStockProducts = (allProducts || []).filter(p => (p.stock || 0) < 10)

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-text">Reportes</h1>
          <p className="text-text-secondary mt-2">Análisis y estadísticas del sistema</p>
        </div>
        <Suspense fallback={<div className="w-48 h-10 bg-background rounded-lg animate-pulse" />}>
          <ReportFilters currentPeriod={periodType} comparePeriods={comparePeriods} />
        </Suspense>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Ingresos {periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : 'Año'} Actual</p>
              <p className="text-2xl font-bold text-text">
                {currentRevenue > 0 ? formatCurrency(currentRevenue) : 'S/. 0.00'}
              </p>
              {comparePeriods && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${revenueGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                  {revenueGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="bg-success/10 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-success" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Pedidos {periodType === 'week' ? 'Semana' : periodType === 'month' ? 'Mes' : 'Año'} Actual</p>
              <p className="text-2xl font-bold text-text">{currentOrdersCount}</p>
              {comparePeriods && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${ordersGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                  {ordersGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{ordersGrowth >= 0 ? '+' : ''}{ordersGrowth.toFixed(1)}%</span>
                </div>
              )}
            </div>
            <div className="bg-primary/10 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-primary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Usuarios Activos</p>
              <p className="text-2xl font-bold text-text">{allUsers?.length || 0}</p>
            </div>
            <div className="bg-secondary/10 p-3 rounded-lg">
              <Users className="w-6 h-6 text-secondary" />
            </div>
          </div>
        </div>

        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Productos Bajo Stock</p>
              <p className="text-2xl font-bold text-text">{lowStockProducts.length}</p>
            </div>
            <div className="bg-warning/10 p-3 rounded-lg">
              <Package className="w-6 h-6 text-warning" />
            </div>
          </div>
        </div>
      </div>

      {/* Gráficas */}
      <Suspense fallback={<div className="h-96 bg-card rounded-lg border border-border animate-pulse" />}>
        <ReportsCharts 
          revenueData={combinedRevenueData}
          ordersData={combinedOrdersData}
          periodType={periodType}
        />
      </Suspense>
    </div>
  )
}
