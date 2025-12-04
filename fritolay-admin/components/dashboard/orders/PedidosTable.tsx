'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { formatCurrency, formatDateTime } from '@/lib/utils'

interface Order {
  id: string
  user_id: string
  status: string
  total_amount: number
  delivery_address: string
  created_at: string
}

interface Customer {
  id: string
  name: string
  email: string
}

interface Assignment {
  order_id: string
  repartidor: {
    id: string
    name: string
    email: string
  }
}

interface PedidosTableProps {
  initialOrders: Order[]
  initialCustomers: Customer[]
  initialAssignments?: Assignment[]
}

export default function PedidosTable({
  initialOrders,
  initialCustomers,
  initialAssignments = [],
}: PedidosTableProps) {
  const [orders, setOrders] = useState(initialOrders)
  const [assignments, setAssignments] = useState(initialAssignments)

  const customerMap = new Map(initialCustomers.map((c) => [c.id, c]))
  const assignmentMap = new Map(
    assignments.map((a) => [a.order_id, a.repartidor])
  )

  const refreshAssignments = async () => {
    const orderIds = orders.map((o) => o.id)
    if (orderIds.length === 0) return

    try {
      const response = await fetch(
        `/api/orders/assignments?order_ids=${orderIds.join(',')}`
      )
      if (response.ok) {
        const data = await response.json()
        setAssignments(data || [])
      }
    } catch (error) {
      console.error('Error refreshing assignments:', error)
    }
  }

  return (
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
            {orders.map((order) => {
              const customer = customerMap.get(order.user_id)
              const repartidor = assignmentMap.get(order.id)
              return (
                <tr key={order.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-text font-mono text-sm">
                    {order.id.slice(0, 8)}...
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-text">
                    {customer?.name || 'N/A'}
                    <br />
                    <span className="text-xs text-text-secondary">
                      {customer?.email}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-text font-bold text-lg">
                      {formatCurrency(order.total_amount || 0)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
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
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-text text-sm">
                    {repartidor ? (
                      <span className="text-text">{repartidor.name}</span>
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
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

