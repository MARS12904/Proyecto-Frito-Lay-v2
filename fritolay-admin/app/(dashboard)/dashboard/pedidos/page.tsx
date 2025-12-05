import { requireAdmin } from '@/lib/auth'
import { OrdersRealtime } from '@/components/dashboard/orders/OrdersRealtime'

export default async function PedidosPage() {
  await requireAdmin()

  return <OrdersRealtime />
}
