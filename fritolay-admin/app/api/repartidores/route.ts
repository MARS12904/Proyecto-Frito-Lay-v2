import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Forzar que esta ruta sea dinámica (sin caché)
export const dynamic = 'force-dynamic'
export const revalidate = 0

export async function GET() {
  try {
    const adminClient = createAdminClient()

    console.log('📋 Fetching repartidores from database...')

    const { data: repartidores, error } = await adminClient
      .from('user_profiles')
      .select('*')
      .eq('role', 'repartidor')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('❌ Error fetching repartidores:', error)
      return NextResponse.json(
        { message: 'Error al cargar repartidores', error: error.message },
        { status: 500 }
      )
    }

    console.log(`✅ Found ${repartidores?.length || 0} repartidores:`, repartidores?.map(r => r.name))

    // Agregar headers anti-caché
    return NextResponse.json(repartidores || [], {
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    })
  } catch (error: any) {
    console.error('Error in GET /api/repartidores:', error)
    return NextResponse.json(
      { message: 'Error inesperado', error: error?.message },
      { status: 500 }
    )
  }
}


