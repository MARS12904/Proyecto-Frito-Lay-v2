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
    offset?: string
  }>
}

export default async function ReportesPage({ searchParams }: ReportPageProps) {
  const params = await searchParams
  await requireAdmin()
  const supabase = createAdminServerClient()

  const periodType = params.period || 'month'
  const comparePeriods = params.compare === 'true'
  const periodOffset = parseInt(params.offset || '0', 10)

  // Calcular fechas según el período
  const now = new Date()
  const getPeriodDates = (type: 'week' | 'month' | 'year', offset: number = 0) => {
    const start = new Date()
    const end = new Date()

    if (type === 'week') {
      // Calcular inicio de la semana (lunes)
      const dayOfWeek = now.getDay() || 7 // Domingo = 7
      start.setDate(now.getDate() - dayOfWeek + 1 - (7 * offset))
      start.setHours(0, 0, 0, 0)
      
      // Fin de la semana (domingo)
      end.setDate(start.getDate() + 6)
      end.setHours(23, 59, 59, 999)
    } else if (type === 'month') {
      // Inicio del mes
      start.setFullYear(now.getFullYear(), now.getMonth() - offset, 1)
      start.setHours(0, 0, 0, 0)
      
      // Fin del mes (último día a las 23:59:59)
      end.setFullYear(now.getFullYear(), now.getMonth() - offset + 1, 0)
      end.setHours(23, 59, 59, 999)
    } else {
      // Inicio del año
      start.setFullYear(now.getFullYear() - offset, 0, 1)
      start.setHours(0, 0, 0, 0)
      
      // Fin del año
      end.setFullYear(now.getFullYear() - offset, 11, 31)
      end.setHours(23, 59, 59, 999)
    }

    return { start, end }
  }

  // Generar etiqueta legible del período
  const getPeriodLabel = (type: 'week' | 'month' | 'year', offset: number) => {
    const start = new Date()
    
    if (type === 'week') {
      const dayOfWeek = now.getDay() || 7
      start.setDate(now.getDate() - dayOfWeek + 1 - (7 * offset))
      const end = new Date(start)
      end.setDate(start.getDate() + 6)
      
      if (offset === 0) return 'Esta semana'
      if (offset === 1) return 'Semana pasada'
      
      return `${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}`
    } else if (type === 'month') {
      start.setFullYear(now.getFullYear(), now.getMonth() - offset, 1)
      const label = start.toLocaleDateString('es-PE', { month: 'long', year: 'numeric' })
      return label.charAt(0).toUpperCase() + label.slice(1)
    } else {
      return (now.getFullYear() - offset).toString()
    }
  }

  const periodLabel = getPeriodLabel(periodType, periodOffset)
  const currentPeriod = getPeriodDates(periodType, periodOffset)
  const previousPeriod = comparePeriods ? getPeriodDates(periodType, periodOffset + 1) : null

  // Obtener pedidos del período actual desde delivery_orders
  // Usamos neq para excluir cancelados
  const { data: currentOrdersRaw, error: currentError } = await supabase
    .from('delivery_orders')
    .select('id, total, created_at, status')
    .gte('created_at', currentPeriod.start.toISOString())
    .lte('created_at', currentPeriod.end.toISOString())
    .neq('status', 'cancelled')
  
  if (currentError) {
    console.error('Error fetching current orders:', currentError)
  }
  
  // Log para debug
  console.log('Period:', periodType, 'Start:', currentPeriod.start.toISOString(), 'End:', currentPeriod.end.toISOString())
  console.log('Current orders found:', currentOrdersRaw?.length || 0)
  
  // Transformar al formato esperado
  const currentOrders = (currentOrdersRaw || []).map((o: any) => ({
    id: o.id,
    total_amount: Number(o.total) || 0,
    created_at: o.created_at,
    status: o.status || 'pending'
  }))

  // Obtener pedidos del período anterior si se requiere comparación
  let previousOrders: any[] = []
  if (previousPeriod) {
    const { data, error: prevError } = await supabase
      .from('delivery_orders')
      .select('id, total, created_at, status')
      .gte('created_at', previousPeriod.start.toISOString())
      .lte('created_at', previousPeriod.end.toISOString())
      .neq('status', 'cancelled')
    
    if (prevError) {
      console.error('Error fetching previous orders:', prevError)
    }
    
    previousOrders = (data || []).map((o: any) => ({
      id: o.id,
      total_amount: Number(o.total) || 0,
      created_at: o.created_at,
      status: o.status || 'pending'
    }))
  }

  // Obtener order_items para calcular totales correctos
  const currentOrderIds = currentOrders.map(o => o.id)
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
    const keyOrder: string[] = [] // Para mantener el orden correcto

    if (type === 'week') {
      for (let i = 0; i < 7; i++) {
        const date = new Date(period.start)
        date.setDate(date.getDate() + i)
        // Usar formato consistente: día/mes
        const key = `${date.getDate()}/${date.getMonth() + 1}`
        data[key] = 0
        keyOrder.push(key)
      }
    } else if (type === 'month') {
      const daysInMonth = new Date(period.end.getFullYear(), period.end.getMonth() + 1, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${i}`
        data[key] = 0
        keyOrder.push(key)
      }
    } else {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      for (let i = 0; i < 12; i++) {
        const key = monthNames[i]
        data[key] = 0
        keyOrder.push(key)
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

    // Agrupar por fecha - incluir TODOS los pedidos no cancelados
    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        const date = new Date(order.created_at)
        let key: string

        if (type === 'week') {
          key = `${date.getDate()}/${date.getMonth() + 1}`
        } else if (type === 'month') {
          key = `${date.getDate()}`
        } else {
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          key = monthNames[date.getMonth()]
        }

        if (data[key] !== undefined) {
          // Usar total_amount directamente (ya viene de delivery_orders.total)
          const orderTotal = order.total_amount || orderTotalsMap.get(order.id) || 0
          data[key] += orderTotal
        }
      }
    })

    // Retornar en el orden correcto
    return keyOrder.map(key => ({
      period: key,
      current: data[key] || 0,
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
    const keyOrder: string[] = [] // Para mantener el orden correcto

    if (type === 'week') {
      for (let i = 0; i < 7; i++) {
        const date = new Date(period.start)
        date.setDate(date.getDate() + i)
        const key = `${date.getDate()}/${date.getMonth() + 1}`
        data[key] = 0
        keyOrder.push(key)
      }
    } else if (type === 'month') {
      const daysInMonth = new Date(period.end.getFullYear(), period.end.getMonth() + 1, 0).getDate()
      for (let i = 1; i <= daysInMonth; i++) {
        const key = `${i}`
        data[key] = 0
        keyOrder.push(key)
      }
    } else {
      const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
      for (let i = 0; i < 12; i++) {
        const key = monthNames[i]
        data[key] = 0
        keyOrder.push(key)
      }
    }

    orders.forEach(order => {
      if (order.status !== 'cancelled') {
        const date = new Date(order.created_at)
        let key: string

        if (type === 'week') {
          key = `${date.getDate()}/${date.getMonth() + 1}`
        } else if (type === 'month') {
          key = `${date.getDate()}`
        } else {
          const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
          key = monthNames[date.getMonth()]
        }

        if (data[key] !== undefined) {
          data[key] += 1
        }
      }
    })

    // Retornar en el orden correcto
    return keyOrder.map(key => ({
      period: key,
      current: data[key] || 0,
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

  // Calcular totales directamente desde delivery_orders.total
  const calculateRevenue = (orders: any[]) => {
    return orders
      .filter(o => o.status !== 'cancelled')
      .reduce((sum, order) => sum + (Number(order.total_amount) || 0), 0)
  }

  const currentRevenue = calculateRevenue(currentOrders)
  const previousRevenue = calculateRevenue(previousOrders)

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
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-text">Reportes</h1>
          <p className="text-text-secondary mt-2">Análisis y estadísticas del sistema</p>
        </div>
        <Suspense fallback={<div className="w-48 h-10 bg-background rounded-lg animate-pulse" />}>
          <ReportFilters 
            currentPeriod={periodType} 
            comparePeriods={comparePeriods} 
            periodOffset={periodOffset}
            periodLabel={periodLabel}
          />
        </Suspense>
      </div>

      {/* Estadísticas principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-card rounded-lg shadow-sm border border-border p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm mb-1">Ingresos - {periodLabel}</p>
              <p className="text-2xl font-bold text-text">
                {currentRevenue > 0 ? formatCurrency(currentRevenue) : 'S/. 0.00'}
              </p>
              {comparePeriods && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${revenueGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                  {revenueGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{revenueGrowth >= 0 ? '+' : ''}{revenueGrowth.toFixed(1)}% vs anterior</span>
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
              <p className="text-text-secondary text-sm mb-1">Pedidos - {periodLabel}</p>
              <p className="text-2xl font-bold text-text">{currentOrdersCount}</p>
              {comparePeriods && (
                <div className={`flex items-center gap-1 mt-1 text-sm ${ordersGrowth >= 0 ? 'text-success' : 'text-error'}`}>
                  {ordersGrowth >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                  <span>{ordersGrowth >= 0 ? '+' : ''}{ordersGrowth.toFixed(1)}% vs anterior</span>
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
