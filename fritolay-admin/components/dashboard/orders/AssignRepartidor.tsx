'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Truck, X, Check } from 'lucide-react'

interface Repartidor {
  id: string
  name: string
  email: string
  phone: string | null
  is_active: boolean
}

interface AssignRepartidorProps {
  orderId: string
  currentRepartidor?: {
    id: string
    name: string
    email: string
  } | null
  onAssignmentChange?: () => void
}

export default function AssignRepartidor({
  orderId,
  currentRepartidor,
  onAssignmentChange,
}: AssignRepartidorProps) {
  const router = useRouter()
  const [repartidores, setRepartidores] = useState<Repartidor[]>([])
  const [selectedRepartidorId, setSelectedRepartidorId] = useState<string>(currentRepartidor?.id || '')
  const [loading, setLoading] = useState(false)
  const [loadingRepartidores, setLoadingRepartidores] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [isOpen, setIsOpen] = useState(false)

  useEffect(() => {
    loadRepartidores()
  }, [])

  const loadRepartidores = async () => {
    try {
      setLoadingRepartidores(true)
      // Agregar timestamp para evitar caché del navegador
      const response = await fetch(`/api/repartidores?t=${Date.now()}`, {
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache',
        }
      })
      const data = await response.json()

      if (response.ok && Array.isArray(data)) {
        // Filtrar repartidores activos (is_active = true o null/undefined se considera activo)
        const activeRepartidores = data.filter((r: any) => r.is_active !== false)
        console.log('🚚 Repartidores cargados:', activeRepartidores.length, 'de', data.length, activeRepartidores.map((r: any) => r.name))
        setRepartidores(activeRepartidores)
        if (currentRepartidor) {
          setSelectedRepartidorId(currentRepartidor.id)
        }
      } else {
        console.error('❌ Error loading repartidores:', data)
        setError('Error al cargar repartidores')
      }
    } catch (err) {
      console.error('❌ Error loading repartidores:', err)
      setError('Error al cargar repartidores')
    } finally {
      setLoadingRepartidores(false)
    }
  }

  const handleAssign = async () => {
    if (!selectedRepartidorId) {
      setError('Por favor selecciona un repartidor')
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch('/api/orders/assign', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          order_id: orderId,
          repartidor_id: selectedRepartidorId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Error al asignar pedido')
        setLoading(false)
        return
      }

      setSuccess(true)
      setIsOpen(false)
      
      // Llamar al callback si existe y refrescar
      onAssignmentChange?.()
      router.refresh()
      
      // Limpiar mensaje de éxito después de 3 segundos
      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error assigning order:', err)
      setError('Error de conexión. Por favor, intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleUnassign = async () => {
    if (!confirm('¿Estás seguro de que deseas desasignar este pedido?')) {
      return
    }

    setLoading(true)
    setError('')
    setSuccess(false)

    try {
      const response = await fetch(`/api/orders/assign?order_id=${orderId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Error al desasignar pedido')
        setLoading(false)
        return
      }

      setSuccess(true)
      setSelectedRepartidorId('')
      onAssignmentChange?.()
      router.refresh()

      setTimeout(() => {
        setSuccess(false)
      }, 3000)
    } catch (err) {
      console.error('Error unassigning order:', err)
      setError('Error de conexión. Por favor, intenta nuevamente.')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen && !currentRepartidor) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors"
      >
        <Truck className="w-4 h-4" />
        Asignar Repartidor
      </button>
    )
  }

  if (!isOpen && currentRepartidor) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-sm text-text-secondary">
          <Truck className="w-4 h-4" />
          <span>Asignado a: <strong className="text-text">{currentRepartidor.name}</strong></span>
        </div>
        <button
          onClick={() => setIsOpen(true)}
          className="text-xs text-primary hover:text-primary-dark"
        >
          Cambiar repartidor
        </button>
        <button
          onClick={handleUnassign}
          disabled={loading}
          className="text-xs text-error hover:text-error-dark disabled:opacity-50"
        >
          Desasignar
        </button>
      </div>
    )
  }

  return (
    <div className="bg-background rounded-lg p-4 border border-border">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-text">Asignar Repartidor</h3>
        <button
          onClick={() => {
            setIsOpen(false)
            setError('')
            setSuccess(false)
          }}
          className="text-text-secondary hover:text-text"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-error/10 border border-error text-error px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 bg-success/10 border border-success text-success px-4 py-3 rounded text-sm flex items-center gap-2">
          <Check className="w-4 h-4" />
          Pedido asignado exitosamente
        </div>
      )}

      <div className="space-y-4">
        <div>
          <label htmlFor="repartidor" className="block text-sm font-medium text-text mb-2">
            Seleccionar Repartidor
          </label>
          {loadingRepartidores ? (
            <div className="px-4 py-2 border border-border rounded-lg text-text-secondary">
              Cargando repartidores...
            </div>
          ) : (
            <select
              id="repartidor"
              value={selectedRepartidorId}
              onChange={(e) => setSelectedRepartidorId(e.target.value)}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            >
              <option value="">Seleccionar repartidor...</option>
              {repartidores.map((repartidor) => (
                <option key={repartidor.id} value={repartidor.id}>
                  {repartidor.name} {repartidor.email && `(${repartidor.email})`}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleAssign}
            disabled={loading || !selectedRepartidorId || loadingRepartidores}
            className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Asignando...' : 'Asignar Pedido'}
          </button>
          <button
            onClick={() => {
              setIsOpen(false)
              setError('')
              setSuccess(false)
            }}
            className="px-4 py-2 border border-border rounded-lg text-text-secondary hover:bg-background transition-colors"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  )
}

