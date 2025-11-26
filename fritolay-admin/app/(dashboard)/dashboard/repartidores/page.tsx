import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import RegisterRepartidorForm from '@/components/dashboard/repartidores/RegisterRepartidorForm'
import RepartidoresTable from '@/components/dashboard/repartidores/RepartidoresTable'

export default async function RepartidoresPage() {
  await requireAdmin()
  const supabase = createAdminServerClient()

  const { data: repartidores, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('role', 'repartidor')
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text mb-4">Repartidores</h1>
        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
          Error al cargar repartidores: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-text mb-6">Gestión de Repartidores</h1>
      <RepartidoresTable initialRepartidores={repartidores || []} />
    </div>
  )
}
