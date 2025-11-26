'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import RegisterRepartidorForm from './RegisterRepartidorForm'
import RepartidorActions from './RepartidorActions'

interface Repartidor {
  id: string
  name: string | null
  email: string
  phone: string | null
  vehicle_type: string | null
  license_number: string | null
  is_active: boolean | null
  phone_verified: boolean | null
  created_at: string
}

interface RepartidoresTableProps {
  initialRepartidores: Repartidor[]
}

export default function RepartidoresTable({ initialRepartidores }: RepartidoresTableProps) {
  const router = useRouter()
  const [repartidores, setRepartidores] = useState(initialRepartidores)

  const handleUpdate = () => {
    // Recargar datos
    fetch('/api/repartidores')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setRepartidores(data)
        } else {
          router.refresh()
        }
      })
      .catch(() => {
        router.refresh()
      })
  }

  return (
    <>
      <RegisterRepartidorForm onSuccess={handleUpdate} />
      
      <div className="bg-card rounded-lg shadow-sm border border-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-background">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Vehículo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Licencia
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {repartidores.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-text-secondary">
                    No hay repartidores registrados
                  </td>
                </tr>
              ) : (
                repartidores.map((repartidor) => (
                  <tr key={repartidor.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-text font-medium">
                      {repartidor.name || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-text">{repartidor.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-text">
                      {repartidor.phone || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-text">
                      {repartidor.vehicle_type ? (
                        <span className="capitalize">{repartidor.vehicle_type}</span>
                      ) : (
                        'N/A'
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-text">
                      {repartidor.license_number || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span
                        className={`px-2 py-1 text-xs rounded ${
                          repartidor.is_active
                            ? 'bg-success/10 text-success'
                            : 'bg-error/10 text-error'
                        }`}
                      >
                        {repartidor.is_active ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <RepartidorActions repartidor={repartidor} onUpdate={handleUpdate} />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}

