import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { data: link, error: linkError } = await supabaseAdmin
    .from('pet_share_links')
    .select('pet_id, expires_at')
    .eq('token', params.token)
    .maybeSingle()

  if (linkError || !link) {
    return NextResponse.json({ error: 'Este enlace no es válido.' }, { status: 404 })
  }

  if (link.expires_at && new Date(link.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Este enlace ya expiró.' }, { status: 410 })
  }

  const { data: pet } = await supabaseAdmin
    .from('pets')
    .select('name, species, breed, sex, weight_kg, allergies, notes, emergency_vet_phone')
    .eq('id', link.pet_id)
    .single()

  const { data: vaccines } = await supabaseAdmin
    .from('pet_vaccines')
    .select('vaccine_name, date_administered, next_due_date')
    .eq('pet_id', link.pet_id)
    .order('next_due_date', { ascending: true })

  return NextResponse.json({ pet, vaccines: vaccines ?? [] })
}
