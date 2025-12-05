import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data: products, error } = await adminClient
      .from('products')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching products:', error)
      return NextResponse.json(
        { message: 'Error al obtener productos', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(products)
  } catch (error: any) {
    console.error('Unexpected error in GET products:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    console.log('POST /api/products - Body recibido:', JSON.stringify(body, null, 2))

    // Validar campos obligatorios
    if (!body.name || body.name.trim() === '') {
      return NextResponse.json(
        { message: 'El nombre del producto es requerido' },
        { status: 400 }
      )
    }

    const price = parseFloat(body.price)
    if (isNaN(price) || price <= 0) {
      return NextResponse.json(
        { message: 'El precio debe ser un número mayor a 0' },
        { status: 400 }
      )
    }

    // Limpiar y validar datos (solo campos que existen en la tabla)
    const productData: Record<string, any> = {
      name: body.name.trim(),
      brand: body.brand?.trim() || null,
      description: body.description?.trim() || null,
      price: price,
      wholesale_price: body.wholesale_price ? parseFloat(body.wholesale_price) : null,
      stock: parseInt(body.stock) || 0,
      category: body.category?.trim() || null,
      weight: body.weight?.trim() || null,
      is_available: body.is_available !== false,
      min_order_quantity: parseInt(body.min_order_quantity) || 1,
      max_order_quantity: parseInt(body.max_order_quantity) || 100,
      tags: Array.isArray(body.tags) ? body.tags : [],
    }
    
    // Solo agregar image si tiene valor (la columna puede no existir)
    if (body.image?.trim()) {
      productData.image = body.image.trim()
    }

    console.log('Datos a insertar:', JSON.stringify(productData, null, 2))

    const adminClient = createAdminClient()
    
    const { data, error } = await adminClient
      .from('products')
      .insert([productData])
      .select()
      .single()

    if (error) {
      console.error('Error de Supabase al crear producto:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      })
      return NextResponse.json(
        { message: 'Error al crear producto', error: error.message, details: error.details },
        { status: 500 }
      )
    }

    console.log('Producto creado exitosamente:', data.id)
    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Error inesperado en POST product:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error.message },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const adminClient = createAdminClient()
    const body = await request.json()
    const { id, ...updateData } = body

    if (!id) {
      return NextResponse.json(
        { message: 'ID de producto requerido' },
        { status: 400 }
      )
    }

    // Limpiar y validar datos
    const productData = {
      name: updateData.name?.trim(),
      brand: updateData.brand?.trim() || null,
      description: updateData.description?.trim() || null,
      price: parseFloat(updateData.price) || 0,
      wholesale_price: updateData.wholesale_price ? parseFloat(updateData.wholesale_price) : null,
      stock: parseInt(updateData.stock) || 0,
      category: updateData.category?.trim() || null,
      weight: updateData.weight?.trim() || null,
      image: updateData.image?.trim() || null,
      is_available: updateData.is_available ?? true,
      min_order_quantity: parseInt(updateData.min_order_quantity) || 1,
      max_order_quantity: parseInt(updateData.max_order_quantity) || 100,
      tags: updateData.tags || [],
      updated_at: new Date().toISOString(),
    }

    const { data, error } = await adminClient
      .from('products')
      .update(productData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating product:', error)
      return NextResponse.json(
        { message: 'Error al actualizar producto', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Unexpected error in PUT product:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error.message },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const adminClient = createAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { message: 'ID de producto requerido' },
        { status: 400 }
      )
    }

    const { error } = await adminClient
      .from('products')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting product:', error)
      return NextResponse.json(
        { message: 'Error al eliminar producto', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ message: 'Producto eliminado correctamente' })
  } catch (error: any) {
    console.error('Unexpected error in DELETE product:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error.message },
      { status: 500 }
    )
  }
}
