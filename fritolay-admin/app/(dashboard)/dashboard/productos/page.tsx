import { requireAdmin } from '@/lib/auth'
import { createAdminServerClient } from '@/lib/supabase/admin-server'
import { formatCurrency } from '@/lib/utils'

export default async function ProductosPage() {
  await requireAdmin()
  const supabase = createAdminServerClient()

  const { data: products, error } = await supabase
    .from('products')
    .select('*')
    .order('name', { ascending: true })

  if (error) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-text mb-4">Productos</h1>
        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded">
          Error al cargar productos: {error.message}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <h1 className="text-3xl font-bold text-text mb-6">Productos</h1>
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Categoría
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Precio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Stock
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products?.map((product) => (
                <tr key={product.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-text">{product.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-text">{product.brand || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-text">{product.category || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-text font-medium">
                    {formatCurrency(product.price || 0)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-text">
                    {product.stock || 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}


