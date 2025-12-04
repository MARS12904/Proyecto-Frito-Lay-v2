'use client'

import { useState } from 'react'
import { Plus, X } from 'lucide-react'

interface RegisterRepartidorFormProps {
  onSuccess: () => void
}

export default function RegisterRepartidorForm({ onSuccess }: RegisterRepartidorFormProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    phone: '',
    license_number: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess(false)

    // Validaciones
    if (!formData.name || !formData.email || !formData.password) {
      setError('Nombre, email y contraseña son requeridos')
      setLoading(false)
      return
    }

    if (formData.password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Las contraseñas no coinciden')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/repartidores/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
          phone: formData.phone.trim() || null,
          license_number: formData.license_number.trim() || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.message || 'Error al registrar repartidor')
        setLoading(false)
        return
      }

      setSuccess(true)
      setError('')
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        phone: '',
        license_number: '',
      })

      // Callback y cerrar después de 2 segundos
      setTimeout(() => {
        setIsOpen(false)
        setSuccess(false)
        onSuccess()
      }, 2000)
    } catch (err) {
      console.error('Registration error:', err)
      setError('Error de conexión. Por favor, intenta nuevamente.')
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="mb-6 flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-dark transition-colors"
      >
        <Plus className="w-5 h-5" />
        <span>Registrar Nuevo Repartidor</span>
      </button>
    )
  }

  return (
    <div className="mb-6 bg-card border border-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-text">Registrar Nuevo Repartidor</h2>
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

      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-error/10 border border-error text-error px-4 py-3 rounded whitespace-pre-line">
            <strong>Error:</strong> {error}
          </div>
        )}

        {success && (
          <div className="bg-success/10 border border-success text-success px-4 py-3 rounded">
            Repartidor creado exitosamente
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
              Nombre Completo *
            </label>
            <input
              id="name"
              name="name"
              type="text"
              value={formData.name}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            />
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
              Email *
            </label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
              Contraseña *
            </label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            />
          </div>

          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
              Confirmar Contraseña *
            </label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              minLength={6}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            />
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-text mb-2">
              Teléfono
            </label>
            <input
              id="phone"
              name="phone"
              type="tel"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            />
          </div>

          <div>
            <label htmlFor="license_number" className="block text-sm font-medium text-text mb-2">
              Número de Licencia
            </label>
            <input
              id="license_number"
              name="license_number"
              type="text"
              value={formData.license_number}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
            />
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading || success}
            className="flex-1 bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Registrando...' : success ? 'Registrado ✓' : 'Registrar Repartidor'}
          </button>
          <button
            type="button"
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
      </form>
    </div>
  )
}


