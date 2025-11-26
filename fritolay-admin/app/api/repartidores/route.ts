import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const adminClient = createAdminClient()

    const { data: repartidores, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('role', 'repartidor')
      .order('created_at', { ascending: false })

    if (error) {
      return NextResponse.json(
        { message: 'Error al cargar repartidores', error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(repartidores || [])
  } catch (error: any) {
    console.error('Error in GET /api/repartidores:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error?.message },
      { status: 500 }
    )
  }
}


