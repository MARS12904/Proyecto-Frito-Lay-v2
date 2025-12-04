'use client'

import { useState } from 'react'
import { Edit2, Trash2, Check, X } from 'lucide-react'

interface Repartidor {
  id: string
  name: string | null
  email: string
  phone: string | null
  license_number: string | null
  is_active: boolean | null
  phone_verified: boolean | null
}

interface RepartidorActionsProps {
  repartidor: Repartidor
  onUpdate: () => void
}

export default function RepartidorActions({ repartidor, onUpdate }: RepartidorActionsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [formData, setFormData] = useState({
    name: repartidor.name || '',
    phone: repartidor.phone || '',
    license_number: repartidor.license_number || '',
    is_active: repartidor.is_active ?? true,
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const value = e.target.type === 'checkbox' 
      ? (e.target as HTMLInputElement).checked 
      : e.target.value
    setFormData({
      ...formData,
      [e.target.name]: value,
    })
  }

  const handleSave = async () => {
    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/repartidores/${repartidor.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Error al actualizar repartidor')
        setLoading(false)
        return
      }

      setIsEditing(false)
      onUpdate()
    } catch (err) {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  const handleDelete = async () => {
    if (!confirm(`¿Estás seguro de eliminar a ${repartidor.name || repartidor.email}?`)) {
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch(`/api/repartidores/${repartidor.id}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Error al eliminar repartidor')
        setLoading(false)
        return
      }

      onUpdate()
    } catch (err) {
      setError('Error de conexión')
      setLoading(false)
    }
  }

  if (isEditing) {
    return (
      <div className="space-y-2">
        {error && (
          <div className="text-xs text-error">{error}</div>
        )}
        <div className="grid grid-cols-2 gap-2">
          <input
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="px-2 py-1 text-sm border border-border rounded text-text bg-background"
            placeholder="Nombre"
          />
          <input
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="px-2 py-1 text-sm border border-border rounded text-text bg-background"
            placeholder="Teléfono"
          />
          <input
            name="license_number"
            value={formData.license_number}
            onChange={handleChange}
            className="px-2 py-1 text-sm border border-border rounded text-text bg-background"
            placeholder="N° Licencia"
          />
        </div>
        <div className="flex gap-2">
          <label className="flex items-center gap-2 text-sm text-text">
            <input
              type="checkbox"
              name="is_active"
              checked={formData.is_active}
              onChange={handleChange}
              className="rounded"
            />
            Activo
          </label>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-success text-white rounded hover:bg-success-dark disabled:opacity-50"
          >
            <Check className="w-4 h-4" />
            Guardar
          </button>
          <button
            onClick={() => {
              setIsEditing(false)
              setFormData({
                name: repartidor.name || '',
                phone: repartidor.phone || '',
                license_number: repartidor.license_number || '',
                is_active: repartidor.is_active ?? true,
              })
              setError('')
            }}
            className="flex items-center gap-1 px-3 py-1 text-sm bg-background border border-border rounded hover:bg-border"
          >
            <X className="w-4 h-4" />
            Cancelar
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setIsEditing(true)}
        className="p-2 text-primary hover:bg-primary/10 rounded transition-colors"
        title="Editar"
      >
        <Edit2 className="w-4 h-4" />
      </button>
      <button
        onClick={handleDelete}
        disabled={loading}
        className="p-2 text-error hover:bg-error/10 rounded transition-colors disabled:opacity-50"
        title="Eliminar"
      >
        <Trash2 className="w-4 h-4" />
      </button>
    </div>
  )
}


