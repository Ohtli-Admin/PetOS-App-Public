'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../lib/supabaseClient'

type Pet = {
  id: string
  name: string
  species: string
  breed: string | null
  sex: string | null
  weight_kg: number | null
  allergies: string | null
  notes: string | null
  emergency_vet_phone: string | null
}

type AiAssist = {
  reflection: string
  possibleCauses: string[]
  whatToDoNow: string
  urgencyFlag: boolean
  urgencyMessage: string | null
}

type Hospital = {
  name: string
  address: string
  phone: string | null
  openNow: boolean | null
  lat: number
  lng: number
}

const SAFE_ACTIONS = [
  'Mantén la calma y evita movimientos bruscos con tu mascota.',
  'No le des medicamentos, comida ni agua sin indicación veterinaria.',
  'Si hay una herida con sangrado, cúbrela con un paño limpio y aplica presión suave.',
  'Evita que tu mascota se lama o muerda la zona afectada.',
  'Si está inconsciente o con dificultad para respirar, busca atención inmediata sin esperar.',
  'Transpórtala con cuidado, evitando forzar la zona afectada.',
]

export default function SosPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)

  const [description, setDescription] = useState('')
  const [eventDate] = useState(new Date().toISOString().split('T')[0])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState<AiAssist | null>(null)
  const [aiError, setAiError] = useState('')

  const [showHospitals, setShowHospitals] = useState(false)
  const [hospitals, setHospitals] = useState<Hospital[]>([])
  const [hospitalsLoading, setHospitalsLoading] = useState(false)
  const [hospitalsError, setHospitalsError] = useState('')

  const supportPhone = process.env.NEXT_PUBLIC_SOS_SUPPORT_PHONE

  useEffect(() => {
    if (!id) return
    supabase
      .from('pets')
      .select('id, name, species, breed, sex, weight_kg, allergies, notes, emergency_vet_phone')
      .eq('id', id)
      .single()
      .then(({ data }) => {
        setPet(data)
        setLoading(false)
      })
  }, [id])

  const handleAskNavigator = async () => {
    if (!description || !pet) return
    setAiLoading(true)
    setAiError('')
    setAiResult(null)

    try {
      const petInfo = `${pet.name}, ${pet.species}${pet.breed ? `, ${pet.breed}` : ''}${pet.weight_kg ? `, ${pet.weight_kg} kg` : ''}${pet.allergies ? `, alergias: ${pet.allergies}` : ''}`

      const res = await fetch('/api/sos-assist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ petInfo, description }),
      })

      if (!res.ok) throw new Error('No se pudo procesar')
      const data = await res.json()
      setAiResult(data)
      if (data.urgencyFlag) setShowHospitals(true)
    } catch {
      setAiError('No se pudo conectar con Navigator en este momento. Llama a la línea de apoyo directamente.')
    } finally {
      setAiLoading(false)
    }
  }

  const handleFindHospitals = () => {
    setShowHospitals(true)
    setHospitalsLoading(true)
    setHospitalsError('')

    if (!navigator.geolocation) {
      setHospitalsError('Tu navegador no soporta ubicación. Usa el mapa manualmente.')
      setHospitalsLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const res = await fetch(
            `/api/nearby-vets?lat=${pos.coords.latitude}&lng=${pos.coords.longitude}`
          )
          const data = await res.json()
          if (data.error) throw new Error(data.error)
          setHospitals(data.hospitals ?? [])
        } catch {
          setHospitalsError('No se pudo obtener la lista de hospitales.')
        } finally {
          setHospitalsLoading(false)
        }
      },
      () => {
        setHospitalsError('No pudimos acceder a tu ubicación. Actívala e inténtalo de nuevo.')
        setHospitalsLoading(false)
      }
    )
  }

  const handleCloseSos = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!description) {
      setError('Describe brevemente qué está pasando antes de registrar')
      return
    }

    setSaving(true)

    const { data: newEpisode, error: insertError } = await supabase
      .from('care_episodes')
      .insert({
        pet_id: id,
        type: 'urgencia',
        title: 'Urgencia',
        description,
        event_date: eventDate,
        follow_up_needed: true,
        status: 'en_seguimiento',
      })
      .select()
      .single()

    if (insertError) {
      setError(insertError.message)
      setSaving(false)
      return
    }

    router.push(`/pets/${id}/episodes/${newEpisode.id}`)
  }

  if (loading) return <p className="page-container text-muted">Cargando...</p>
  if (!pet) return <p className="page-container text-muted">Mascota no encontrada</p>

  return (
    <div className="page-container">
      <button onClick={() => router.push(`/pets/${id}`)} className="btn-text text-sm mb-4 block">
        ← Volver a {pet.name}
      </button>

      <div className="rounded-xl border border-danger bg-danger/5 p-6 mb-6">
        <p className="eyebrow text-danger mb-2">Modo urgencia · {pet.name}</p>
        <h1 className="text-3xl mb-3">SOS PetOS</h1>
        <p className="text-sm text-ink">
          PetOS no diagnostica ni prescribe. Esta guía te ayuda a organizar lo básico
          mientras consigues atención veterinaria real lo antes posible.
        </p>
      </div>

      <p className="eyebrow mb-3">Mientras tanto</p>
      <div className="card mb-6">
        <ul className="space-y-3">
          {SAFE_ACTIONS.map((action, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="font-mono text-muted">{String(i + 1).padStart(2, '0')}</span>
              <span>{action}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Paso 1: Navigator */}
      <p className="eyebrow mb-3">Paso 1 · Cuéntale a Navigator qué pasa</p>
      <div className="card mb-6">
        <textarea
          className="field-textarea"
          placeholder="Describe brevemente el síntoma o la situación"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <button
          onClick={handleAskNavigator}
          className="btn-primary w-full"
          disabled={aiLoading || !description}
        >
          {aiLoading ? 'Navigator está pensando...' : 'Pedir ayuda a Navigator'}
        </button>

        {aiError && <p className="text-danger text-sm mt-4">{aiError}</p>}

        {aiResult && (
          <div className="mt-4 pt-4 border-t border-border">
            {aiResult.urgencyFlag && aiResult.urgencyMessage && (
              <div className="rounded-lg bg-danger text-white px-4 py-3 mb-3 text-sm font-medium">
                {aiResult.urgencyMessage}
              </div>
            )}
            <p className="text-sm mb-3">{aiResult.reflection}</p>
            {aiResult.possibleCauses.length > 0 && (
              <p className="text-sm text-muted mb-2">
                Podría estar relacionado con: {aiResult.possibleCauses.join(', ')} — sin certeza, solo el veterinario puede confirmarlo.
              </p>
            )}
            <p className="text-sm font-medium">{aiResult.whatToDoNow}</p>
          </div>
        )}
      </div>

      {/* Paso 2: Erick, aparece después de la respuesta de Navigator (o si el tutor decide saltarlo) */}
      {(aiResult || aiError) && supportPhone && (
        <>
          <p className="eyebrow mb-3">Paso 2 · ¿Sigues necesitando ayuda?</p>
          <div className="card mb-6">
            <p className="text-sm mb-3">
              Si con esto no es suficiente, habla con una persona real de PetOS.
            </p>
            <a
              href={`tel:${supportPhone}`}
              className="flex items-center justify-center rounded-xl bg-brand text-white px-4 py-4 font-medium text-lg hover:bg-brand-dark transition-colors"
            >
              📞 Llamar a la línea de apoyo PetOS
            </a>
            <button
              onClick={handleFindHospitals}
              className="btn-text text-sm mt-3 block mx-auto"
            >
              O ir directo a ver hospitales cercanos →
            </button>
          </div>
        </>
      )}

      {/* Paso 3: Hospitales, aparece si Navigator marcó urgencia o el tutor pidió verlos */}
      {showHospitals && (
        <>
          <p className="eyebrow mb-3">Paso 3 · Si van al hospital</p>
          <div className="card mb-6">
            <p className="text-sm text-muted mb-3">
              Cuelga con Erick y llama directo al hospital al que se dirigen — ahí les darán las instrucciones más precisas y el seguimiento hasta que lleguen.
            </p>
            {hospitalsLoading && <p className="text-muted text-sm">Buscando cerca de ti...</p>}
            {hospitalsError && <p className="text-danger text-sm">{hospitalsError}</p>}

            {hospitals.length > 0 && (
              <div className="space-y-3">
                {hospitals.map((h, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium">{h.name}</p>
                      {h.openNow !== null && (
                        <span className={`text-xs font-medium ${h.openNow ? 'text-success' : 'text-danger'}`}>
                          {h.openNow ? 'Abierto ahora' : 'Cerrado'}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted mb-2">{h.address}</p>
                    <div className="flex gap-2">
                      {h.phone && (
                        <a href={`tel:${h.phone}`} className="btn-secondary text-sm flex-1 text-center">
                          Llamar
                        </a>
                      )}
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${h.lat},${h.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn-secondary text-sm flex-1 text-center"
                      >
                        Cómo llegar
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      <p className="eyebrow mb-3">Información para compartir con la clínica</p>
      <div className="card mb-6">
        <p className="text-xl font-display mb-1">{pet.name}</p>
        <p className="text-sm text-muted mb-4">
          {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}{pet.sex ? ` · ${pet.sex}` : ''}
          {pet.weight_kg ? ` · ${pet.weight_kg} kg` : ''}
        </p>
        <p className="text-sm">
          <span className="font-medium">Alergias: </span>
          {pet.allergies || 'Ninguna registrada'}
        </p>
        {pet.notes && (
          <p className="text-sm mt-1">
            <span className="font-medium">Notas: </span>{pet.notes}
          </p>
        )}
        {pet.emergency_vet_phone && (
          <a href={`tel:${pet.emergency_vet_phone}`} className="btn-secondary text-sm mt-3 inline-block">
            Llamar a mi veterinario habitual
          </a>
        )}
      </div>

      <p className="eyebrow mb-3">Registrar lo ocurrido</p>
      <div className="card">
        <form onSubmit={handleCloseSos}>
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <button type="submit" className="btn-primary w-full" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar y crear episodio de seguimiento'}
          </button>
          <p className="text-xs text-muted mt-3">
            Esto crea un episodio de "Urgencia" en el historial de {pet.name}, donde podrás
            agregar seguimiento después (diagnóstico, tratamiento, resultado).
          </p>
        </form>
      </div>
    </div>
  )
}
