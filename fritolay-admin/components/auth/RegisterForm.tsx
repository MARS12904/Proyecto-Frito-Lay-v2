'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function RegisterForm() {
  const router = useRouter()
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setError('Todos los campos son requeridos')
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
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.toLowerCase().trim(),
          password: formData.password,
        }),
      })

      let data
      try {
        data = await response.json()
      } catch (parseError) {
        console.error('Error parsing response:', parseError)
        setError('Error al procesar la respuesta del servidor')
        setLoading(false)
        return
      }

      if (!response.ok) {
        console.error('Registration error:', data)
        // Mostrar mensaje de error más detallado
        let errorMessage = data.message || `Error al registrar administrador (${response.status})`
        
        // Agregar detalles adicionales si están disponibles
        if (data.error) {
          errorMessage += `\nDetalle: ${data.error}`
        }
        if (data.details) {
          errorMessage += `\n${data.details}`
        }
        if (data.hint) {
          errorMessage += `\nSugerencia: ${data.hint}`
        }
        
        setError(errorMessage)
        setLoading(false)
        return
      }

      setSuccess(true)
      setError('')
      
      // Redirigir al login después de 2 segundos
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch (err) {
      console.error('Registration error:', err)
      setError('Error de conexión. Por favor, verifica tu conexión e intenta nuevamente.')
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-error/10 border border-error text-error px-4 py-3 rounded whitespace-pre-line">
          <strong>Error:</strong> {error}
        </div>
      )}

      {success && (
        <div className="bg-success/10 border border-success text-success px-4 py-3 rounded">
          Administrador creado exitosamente. Redirigiendo al login...
        </div>
      )}

      <div>
        <label htmlFor="name" className="block text-sm font-medium text-text mb-2">
          Nombre Completo
        </label>
        <input
          id="name"
          name="name"
          type="text"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
          placeholder="Juan Pérez"
        />
      </div>

      <div>
        <label htmlFor="email" className="block text-sm font-medium text-text mb-2">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          value={formData.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-text bg-background"
          placeholder="admin@fritolay.com"
        />
      </div>

      <div>
        <label htmlFor="password" className="block text-sm font-medium text-text mb-2">
          Contraseña
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
          placeholder="••••••••"
        />
      </div>

      <div>
        <label htmlFor="confirmPassword" className="block text-sm font-medium text-text mb-2">
          Confirmar Contraseña
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
          placeholder="••••••••"
        />
      </div>

      <button
        type="submit"
        disabled={loading || success}
        className="w-full bg-primary text-white py-2 px-4 rounded-lg font-medium hover:bg-primary-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Registrando...' : success ? 'Registrado ✓' : 'Registrar Administrador'}
      </button>
    </form>
  )
}

