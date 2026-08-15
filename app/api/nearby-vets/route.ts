import { NextRequest, NextResponse } from 'next/server'

type PlaceResult = {
  place_id: string
  name: string
  vicinity?: string
  geometry: { location: { lat: number; lng: number } }
  opening_hours?: { open_now?: boolean }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'Falta la ubicación' }, { status: 400 })
  }

  if (!process.env.GOOGLE_PLACES_API_KEY) {
    console.error('GOOGLE_PLACES_API_KEY no está definida en el .env')
    return NextResponse.json({ error: 'Falta configurar GOOGLE_PLACES_API_KEY' }, { status: 500 })
  }

  const apiKey = process.env.GOOGLE_PLACES_API_KEY!

  try {
    const nearbyUrl = `https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=${lat},${lng}&radius=15000&keyword=hospital%20veterinario%20urgencias&type=veterinary_care&key=${apiKey}`
    const nearbyRes = await fetch(nearbyUrl)
    const nearbyData = await nearbyRes.json()

    if (nearbyData.status !== 'OK' && nearbyData.status !== 'ZERO_RESULTS') {
      console.error('Error de Google Places (nearbysearch):', JSON.stringify(nearbyData))
      return NextResponse.json(
        { error: `Google Places respondió: ${nearbyData.status}`, detail: nearbyData.error_message },
        { status: 500 }
      )
    }

    const results: PlaceResult[] = (nearbyData.results ?? []).slice(0, 5)

    const withPhones = await Promise.all(
      results.map(async (place) => {
        const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=formatted_phone_number&key=${apiKey}`
        const detailsRes = await fetch(detailsUrl)
        const detailsData = await detailsRes.json()

        return {
          name: place.name,
          address: place.vicinity ?? '',
          phone: detailsData.result?.formatted_phone_number ?? null,
          openNow: place.opening_hours?.open_now ?? null,
          lat: place.geometry.location.lat,
          lng: place.geometry.location.lng,
        }
      })
    )

    return NextResponse.json({ hospitals: withPhones })
  } catch (err) {
    console.error('Error inesperado en nearby-vets:', err)
    return NextResponse.json({ error: 'No se pudo buscar hospitales cercanos' }, { status: 500 })
  }
}