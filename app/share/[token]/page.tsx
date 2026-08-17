'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { formatDate } from '../../../lib/formatDate'

type SharedPet = {
  name: string
  species: string
  breed: string | null
  sex: string | null
  weight_kg: number | null
  allergies: string | null
  notes: string | null
  regular_vet_name: string | null
  emergency_vet_phone: string | null
}

type SharedVaccine = {
  vaccine_name: string
  date_administered: string
  next_due_date: string | null
}

export default function SharePage() {
  const { token } = useParams<{ token: string }>()
  const [pet, setPet] = useState<SharedPet | null>(null)
  const [vaccines, setVaccines] = useState<SharedVaccine[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) return
    fetch(`/api/share/${token}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'No se pudo cargar la ficha.')
        setPet(data.pet)
        setVaccines(data.vaccines)
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false))
  }, [token])

  if (loading) return <p className="page-container text-muted">Cargando...</p>
  if (error) return <p className="page-container text-danger">{error}</p>
  if (!pet) return <p className="page-container text-muted">Ficha no encontrada.</p>

  return (
    <div className="page-container">
      <p className="eyebrow mb-2">Ficha compartida · PetOS</p>
      <h1 className="text-4xl mb-6">{pet.name}</h1>

      <div className="card mb-6">
        <p className="text-sm text-muted mb-4">
          {pet.species}{pet.breed ? ` · ${pet.breed}` : ''}{pet.sex ? ` · ${pet.sex}` : ''}
          {pet.weight_kg ? ` · ${pet.weight_kg} kg` : ''}
        </p>
        <p className="text-sm">
          <span className="font-medium">Alergias: </span>{pet.allergies || 'Ninguna registrada'}
        </p>
        {pet.notes && (
          <p className="text-sm mt-1"><span className="font-medium">Notas: </span>{pet.notes}</p>
        )}
        {pet.emergency_vet_phone && (
          <a href={`tel:${pet.emergency_vet_phone}`} className="btn-secondary text-sm mt-3 inline-block">
            Llamar a {pet.regular_vet_name || 'su veterinario de confianza'}
          </a>
        )}
      </div>

      <p className="eyebrow mb-3">Cartilla de vacunación</p>
      {vaccines.length === 0 ? (
        <p className="text-muted">Sin vacunas registradas.</p>
      ) : (
        <div className="grid gap-3">
          {vaccines.map((v, i) => (
            <div key={i} className="card py-4">
              <p className="font-medium">{v.vaccine_name}</p>
              <p className="text-sm text-muted font-mono">
                Aplicada: {formatDate(v.date_administered)}
                {v.next_due_date && <> · Próxima: {formatDate(v.next_due_date)}</>}
              </p>
            </div>
          ))}
        </div>
      )}

      <p className="text-xs text-muted mt-8">
        Esta es una ficha de solo lectura compartida por el tutor de {pet.name} a través de PetOS.
      </p>
    </div>
  )
}
