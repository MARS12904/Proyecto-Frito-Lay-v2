'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Plus, Edit, Trash2, Package } from 'lucide-react'

interface Product {
  id: string
  name: string
  brand: string
  description: string
  price: number
  wholesale_price: number
  stock: number
  category: string
  weight: string
  image: string
  is_available: boolean
  min_order_quantity: number
  max_order_quantity: number
  tags: string[]
  created_at: string
  updated_at: string
}

export default function ProductosPage() {
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingProduct, setEditingProduct] = useState<Product | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    brand: '',
    description: '',
    price: '',
    wholesale_price: '',
    stock: '',
    category: '',
    weight: '',
    image: '',
    is_available: true,
    min_order_quantity: '1',
    max_order_quantity: '100',
    tags: ''
  })

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products')
      if (response.ok) {
        const data = await response.json()
        setProducts(data)
      }
    } catch (error) {
      console.error('Error fetching products:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const productData = {
      ...formData,
      price: parseFloat(formData.price),
      wholesale_price: parseFloat(formData.wholesale_price),
      stock: parseInt(formData.stock),
      min_order_quantity: parseInt(formData.min_order_quantity),
      max_order_quantity: parseInt(formData.max_order_quantity),
      tags: formData.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
    }

    try {
      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products'
      const method = editingProduct ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(productData),
      })

      if (response.ok) {
        await fetchProducts()
        setShowForm(false)
        setEditingProduct(null)
        resetForm()
      } else {
        const error = await response.json()
        alert('Error: ' + error.message)
      }
    } catch (error) {
      console.error('Error saving product:', error)
      alert('Error al guardar el producto')
    }
  }

  const handleEdit = (product: Product) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      brand: product.brand || '',
      description: product.description || '',
      price: product.price.toString(),
      wholesale_price: (product.wholesale_price || 0).toString(),
      stock: product.stock.toString(),
      category: product.category || '',
      weight: product.weight || '',
      image: product.image || '',
      is_available: product.is_available,
      min_order_quantity: product.min_order_quantity.toString(),
      max_order_quantity: product.max_order_quantity.toString(),
      tags: product.tags ? product.tags.join(', ') : ''
    })
    setShowForm(true)
  }

  const handleDelete = async (productId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return
    }

    try {
      const response = await fetch(`/api/products/${productId}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchProducts()
      } else {
        const error = await response.json()
        alert('Error: ' + error.message)
      }
    } catch (error) {
      console.error('Error deleting product:', error)
      alert('Error al eliminar el producto')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      brand: '',
      description: '',
      price: '',
      wholesale_price: '',
      stock: '',
      category: '',
      weight: '',
      image: '',
      is_available: true,
      min_order_quantity: '1',
      max_order_quantity: '100',
      tags: ''
    })
  }

  const handleCancel = () => {
    setShowForm(false)
    setEditingProduct(null)
    resetForm()
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center h-64">
          <div className="text-lg">Cargando productos...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-text">Productos</h1>
          <p className="text-text-secondary">Gestiona el catálogo de productos</p>
        </div>
        <Button onClick={() => setShowForm(true)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Nuevo Producto
        </Button>
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
            <CardDescription>
              {editingProduct ? 'Modifica los datos del producto' : 'Agrega un nuevo producto al catálogo'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nombre *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="brand">Marca</Label>
                  <Input
                    id="brand"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="price">Precio Unitario *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="wholesale_price">Precio Mayorista</Label>
                  <Input
                    id="wholesale_price"
                    type="number"
                    step="0.01"
                    value={formData.wholesale_price}
                    onChange={(e) => setFormData({ ...formData, wholesale_price: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Stock *</Label>
                  <Input
                    id="stock"
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="category">Categoría</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Peso</Label>
                  <Input
                    id="weight"
                    value={formData.weight}
                    onChange={(e) => setFormData({ ...formData, weight: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="min_order_quantity">Cantidad Mínima</Label>
                  <Input
                    id="min_order_quantity"
                    type="number"
                    value={formData.min_order_quantity}
                    onChange={(e) => setFormData({ ...formData, min_order_quantity: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="max_order_quantity">Cantidad Máxima</Label>
                  <Input
                    id="max_order_quantity"
                    type="number"
                    value={formData.max_order_quantity}
                    onChange={(e) => setFormData({ ...formData, max_order_quantity: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description">Descripción</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                />
              </div>
              <div>
                <Label htmlFor="image">URL de Imagen</Label>
                <Input
                  id="image"
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="tags">Etiquetas (separadas por coma)</Label>
                <Input
                  id="tags"
                  value={formData.tags}
                  onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                  placeholder="ej: papas, fritas, sal"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="is_available"
                  checked={formData.is_available}
                  onChange={(e) => setFormData({ ...formData, is_available: e.target.checked })}
                />
                <Label htmlFor="is_available">Producto disponible</Label>
              </div>
              <div className="flex gap-2">
                <Button type="submit">
                  {editingProduct ? 'Actualizar' : 'Crear'} Producto
                </Button>
                <Button type="button" variant="outline" onClick={handleCancel}>
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products.map((product) => (
          <Card key={product.id} className="relative">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  {product.brand && (
                    <CardDescription>{product.brand}</CardDescription>
                  )}
                </div>
                <div className="flex gap-1">
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleEdit(product)}
                  >
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleDelete(product.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Package className="w-4 h-4 text-text-secondary" />
                  <span className="text-sm text-text-secondary">Stock: {product.stock}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-lg font-semibold text-primary">
                    S/ {product.price.toFixed(2)}
                  </span>
                  {product.wholesale_price && (
                    <span className="text-sm text-text-secondary">
                      Mayorista: S/ {product.wholesale_price.toFixed(2)}
                    </span>
                  )}
                </div>
                {product.category && (
                  <span className="inline-block bg-secondary text-secondary-foreground px-2 py-1 rounded text-xs">
                    {product.category}
                  </span>
                )}
                {!product.is_available && (
                  <span className="inline-block bg-warning text-warning-foreground px-2 py-1 rounded text-xs">
                    No disponible
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {products.length === 0 && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-text-secondary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-text mb-2">No hay productos</h3>
          <p className="text-text-secondary mb-4">
            Comienza agregando tu primer producto al catálogo
          </p>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Agregar Producto
          </Button>
        </div>
      )}
    </div>
  )
}
