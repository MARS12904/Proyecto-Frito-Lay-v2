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
    const adminClient = createAdminClient()
    const body = await request.json()

    const { data, error } = await adminClient
      .from('products')
      .insert([body])
      .select()
      .single()

    if (error) {
      console.error('Error creating product:', error)
      return NextResponse.json(
        { message: 'Error al crear producto', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error: any) {
    console.error('Unexpected error in POST product:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error.message },
      { status: 500 }
    )
  }
}
