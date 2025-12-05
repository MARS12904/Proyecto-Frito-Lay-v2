'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Product {
  id?: string
  name: string
  brand: string
  description: string
  price: number
  wholesale_price: number | null
  stock: number
  category: string
  weight: string
  image: string
  is_available: boolean
  min_order_quantity: number
  max_order_quantity: number
  tags: string[]
}

interface ProductFormProps {
  product?: Product | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  'Papas',
  'Doritos',
  'Cheetos',
  'Tostitos',
  'Fritos',
  'Sabritas',
  'Galletas',
  'Dulces',
  'Bebidas',
  'Otros'
]

const initialFormData: Product = {
  name: '',
  brand: 'Frito Lay',
  description: '',
  price: 0,
  wholesale_price: null,
  stock: 0,
  category: '',
  weight: '',
  image: '',
  is_available: true,
  min_order_quantity: 1,
  max_order_quantity: 100,
  tags: []
}

export function ProductForm({ product, onClose, onSuccess }: ProductFormProps) {
  const [formData, setFormData] = useState<Product>(initialFormData)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tagsInput, setTagsInput] = useState('')

  const isEditing = !!product?.id

  useEffect(() => {
    if (product) {
      setFormData(product)
      setTagsInput(product.tags?.join(', ') || '')
    } else {
      setFormData(initialFormData)
      setTagsInput('')
    }
  }, [product])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        [name]: (e.target as HTMLInputElement).checked
      }))
    } else if (type === 'number') {
      setFormData(prev => ({
        ...prev,
        [name]: value === '' ? 0 : parseFloat(value)
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }))
    }
  }

  const handleTagsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTagsInput(e.target.value)
    const tags = e.target.value.split(',').map(tag => tag.trim()).filter(Boolean)
    setFormData(prev => ({ ...prev, tags }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    // Validación básica
    if (!formData.name.trim()) {
      setError('El nombre del producto es requerido')
      setIsLoading(false)
      return
    }

    if (formData.price <= 0) {
      setError('El precio debe ser mayor a 0')
      setIsLoading(false)
      return
    }

    try {
      const url = '/api/products'
      const method = isEditing ? 'PUT' : 'POST'
      const body = isEditing ? { ...formData, id: product.id } : formData

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || 'Error al guardar el producto')
      }

      onSuccess()
      onClose()
    } catch (err: any) {
      setError(err.message || 'Error al guardar el producto')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <h2 className="text-xl font-bold text-text">
            {isEditing ? 'Editar Producto' : 'Nuevo Producto'}
          </h2>
          <button
            onClick={onClose}
            className="text-text-secondary hover:text-text transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-error/10 border border-error text-error px-4 py-3 rounded-lg">
              {error}
            </div>
          )}

          {/* Información básica */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nombre del producto *</Label>
              <Input
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="Ej: Doritos Nacho"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="brand">Marca</Label>
              <Input
                id="brand"
                name="brand"
                value={formData.brand}
                onChange={handleChange}
                placeholder="Ej: Frito Lay"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descripción</Label>
            <Textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              placeholder="Descripción del producto..."
              rows={3}
            />
          </div>

          {/* Precios y stock */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Precio (S/) *</Label>
              <Input
                id="price"
                name="price"
                type="number"
                step="0.01"
                min="0"
                value={formData.price || ''}
                onChange={handleChange}
                placeholder="0.00"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="wholesale_price">Precio mayorista (S/)</Label>
              <Input
                id="wholesale_price"
                name="wholesale_price"
                type="number"
                step="0.01"
                min="0"
                value={formData.wholesale_price || ''}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="stock">Stock</Label>
              <Input
                id="stock"
                name="stock"
                type="number"
                min="0"
                value={formData.stock || ''}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
          </div>

          {/* Categoría y peso */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category">Categoría</Label>
              <select
                id="category"
                name="category"
                value={formData.category}
                onChange={handleChange}
                className="w-full h-10 px-3 py-2 text-sm rounded-md border border-border bg-background text-text focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              >
                <option value="">Seleccionar categoría</option>
                {CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="weight">Peso/Contenido</Label>
              <Input
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                placeholder="Ej: 150g"
              />
            </div>
          </div>

          {/* Cantidades */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="min_order_quantity">Cantidad mínima</Label>
              <Input
                id="min_order_quantity"
                name="min_order_quantity"
                type="number"
                min="1"
                value={formData.min_order_quantity || 1}
                onChange={handleChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_order_quantity">Cantidad máxima</Label>
              <Input
                id="max_order_quantity"
                name="max_order_quantity"
                type="number"
                min="1"
                value={formData.max_order_quantity || 100}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Imagen y tags */}
          <div className="space-y-2">
            <Label htmlFor="image">URL de imagen</Label>
            <Input
              id="image"
              name="image"
              type="url"
              value={formData.image}
              onChange={handleChange}
              placeholder="https://ejemplo.com/imagen.jpg"
            />
            {formData.image && (
              <div className="mt-2">
                <img 
                  src={formData.image} 
                  alt="Preview" 
                  className="w-24 h-24 object-cover rounded-lg border border-border"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
            <Input
              id="tags"
              name="tags"
              value={tagsInput}
              onChange={handleTagsChange}
              placeholder="nuevo, popular, oferta"
            />
          </div>

          {/* Disponibilidad */}
          <div className="flex items-center space-x-2">
            <input
              id="is_available"
              name="is_available"
              type="checkbox"
              checked={formData.is_available}
              onChange={handleChange}
              className="w-4 h-4 text-primary bg-background border-border rounded focus:ring-primary focus:ring-2"
            />
            <Label htmlFor="is_available" className="cursor-pointer">
              Producto disponible
            </Label>
          </div>

          {/* Botones */}
          <div className="flex justify-end gap-3 pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Guardando...
                </span>
              ) : isEditing ? 'Actualizar' : 'Crear Producto'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

