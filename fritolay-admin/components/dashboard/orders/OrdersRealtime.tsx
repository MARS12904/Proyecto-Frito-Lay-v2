'use client'

import { useEffect, useState } from 'react'
import { formatCurrency, formatDateTime } from '@/lib/utils'
import Link from 'next/link'

interface Order {
  id: string
  user_id: string
  status: string
  delivery_status: string
  total_amount: number
  delivery_address: string
  delivery_date: string
  delivery_time_slot: string
  payment_method: string
  notes: string
  created_at: string
  updated_at: string
  itemCount?: number
  calculatedTotal?: number
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-warning/10 text-warning'
    case 'confirmed':
      return 'bg-info/10 text-info'
    case 'preparing':
      return 'bg-primary/10 text-primary'
    case 'shipped':
      return 'bg-secondary/10 text-secondary'
    case 'delivered':
      return 'bg-success/10 text-success'
    case 'cancelled':
      return 'bg-error/10 text-error'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'pending':
      return 'Pendiente'
    case 'confirmed':
      return 'Confirmado'
    case 'preparing':
      return 'Preparando'
    case 'shipped':
      return 'Enviado'
    case 'delivered':
      return 'Entregado'
    case 'cancelled':
      return 'Cancelado'
    default:
      return status
  }
}


export function OrdersRealtime() {
  const [orders, setOrders] = useState<Order[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())
  const [refreshCount, setRefreshCount] = useState(0)

  // Cargar pedidos usando API route (para bypassear RLS)
  const loadOrders = async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true)
      
      // Añadir timestamp para evitar cache
      const response = await fetch(`/api/orders?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      
      if (!response.ok) {
        throw new Error('Error al cargar pedidos')
      }
      
      const data = await response.json()
      console.log('📦 Pedidos cargados:', data.length, 'pedidos')
      setOrders(data)
      setLastUpdate(new Date())
      setError(null)
    } catch (err: any) {
      console.error('Error loading orders:', err)
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Cargar pedidos inicialmente
  useEffect(() => {
    loadOrders(true)
  }, [])

  // Polling cada 5 segundos para actualizar automáticamente
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      console.log('🔄 Actualizando pedidos...')
      loadOrders(false)
      setRefreshCount(prev => prev + 1)
    }, 5000)

    return () => {
      clearInterval(pollingInterval)
    }
  }, [])

  // Función para refrescar manualmente
  const handleRefresh = () => {
    loadOrders(false)
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text mb-4">Pedidos</h1>
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text mb-4">Pedidos</h1>
        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
          Error al cargar pedidos: {error}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Pedidos</h1>
          <p className="text-text-secondary mt-1">
            {orders.length} pedidos en total
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Indicador de tiempo real */}
          <div className="flex items-center gap-2 px-3 py-1.5 bg-success/10 rounded-full">
            <span className="w-2 h-2 bg-success rounded-full animate-pulse"></span>
            <span className="text-sm text-success font-medium">En vivo</span>
          </div>
          <p className="text-sm text-text-secondary">
            Última actualización: {lastUpdate.toLocaleTimeString()}
          </p>
          <button
            onClick={handleRefresh}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors flex items-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Refrescar
          </button>
        </div>
      </div>

      {/* Estadísticas rápidas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        {['pending', 'confirmed', 'preparing', 'shipped', 'delivered', 'cancelled'].map(status => {
          const count = orders.filter(o => o.status === status).length
          return (
            <div key={status} className={`rounded-lg p-4 ${getStatusColor(status)} bg-opacity-10`}>
              <p className="text-2xl font-bold">{count}</p>
              <p className="text-sm">{getStatusLabel(status)}</p>
            </div>
          )
        })}
      </div>

      {/* Tabla de pedidos */}
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Pedido
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Items
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Fecha Entrega
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Pago
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-text-secondary">
                    No hay pedidos registrados
                  </td>
                </tr>
              ) : (
                orders.map((order) => (
                  <tr key={order.id} className="hover:bg-background/50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-text">#{order.id.slice(0, 8)}</p>
                        <p className="text-sm text-text-secondary">
                          {formatDateTime(order.created_at)}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-text">
                      {order.itemCount || 0} productos
                    </td>
                    <td className="px-6 py-4 text-text font-medium">
                      {formatCurrency(order.calculatedTotal || order.total_amount || 0)}
                    </td>
                    <td className="px-6 py-4 text-text">
                      {order.delivery_date || 'N/A'}
                      {order.delivery_time_slot && (
                        <span className="text-text-secondary text-sm block">
                          {order.delivery_time_slot}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-text">
                      {order.payment_method || 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <Link
                        href={`/dashboard/pedidos/${order.id}`}
                        className="text-primary hover:text-primary/80 font-medium"
                      >
                        Ver detalle
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

