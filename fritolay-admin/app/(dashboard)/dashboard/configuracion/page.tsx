import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'

export default async function ConfiguracionPage() {
  await requireAdmin()
  const supabase = createAdminServerClient()

  const { data: settings, error } = await supabase
    .from('system_settings')
    .select('*')
    .single()

  if (error && error.code !== 'PGRST116') {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text mb-4">Configuración</h1>
        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
          Error al cargar configuración: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-text mb-6">Configuración del Sistema</h1>
      <div className="bg-card rounded-lg shadow-sm border border-border p-6">
        {settings ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Tarifa de Entrega por Defecto
              </label>
              <p className="text-text-secondary">${settings.default_delivery_fee || 0}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Permitir Registro de Administradores
              </label>
              <p className="text-text-secondary">
                {settings.allow_admin_registration ? 'Sí' : 'No'}
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-text mb-2">
                Email de Soporte
              </label>
              <p className="text-text-secondary">{settings.support_email || 'N/A'}</p>
            </div>
          </div>
        ) : (
          <p className="text-text-secondary">
            No hay configuración disponible. Ejecuta el script de configuración en la base de datos.
          </p>
        )}
      </div>
    </div>
  )
}


