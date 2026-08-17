'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../../../lib/supabaseClient'
import { StatusPill } from '../../../../components/ui/StatusPill'
import { DateField } from '../../../../components/ui/DateField'
import { formatDate } from '../../../../lib/formatDate'

type EpisodeType =
  | 'sintoma' | 'consulta' | 'vacuna' | 'tratamiento'
  | 'estudio' | 'cambio_comportamiento' | 'seguimiento' | 'urgencia'

type Episode = {
  id: string
  type: EpisodeType
  status: string
  title: string
  description: string | null
  vet_name: string | null
  clinic_name: string | null
  event_date: string
  follow_up_needed: boolean
  follow_up_date: string | null
}

const TYPE_LABELS: Record<EpisodeType, string> = {
  sintoma: 'Síntoma',
  consulta: 'Consulta',
  vacuna: 'Vacuna',
  tratamiento: 'Tratamiento',
  estudio: 'Estudio',
  cambio_comportamiento: 'Cambio de comportamiento',
  seguimiento: 'Seguimiento',
  urgencia: 'Urgencia',
}

export default function EpisodesPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [petName, setPetName] = useState('')
  const [episodes, setEpisodes] = useState<Episode[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [type, setType] = useState<EpisodeType>('consulta')
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [vetName, setVetName] = useState('')
  const [clinicName, setClinicName] = useState('')
  const [eventDate, setEventDate] = useState(new Date().toISOString().split('T')[0])
  const [followUpNeeded, setFollowUpNeeded] = useState(false)
  const [followUpDate, setFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!id) return
    loadAll()
  }, [id])

  const loadAll = async () => {
    setLoading(true)
    const { data: petData } = await supabase.from('pets').select('name').eq('id', id).single()
    setPetName(petData?.name ?? '')

    const { data, error } = await supabase
      .from('care_episodes')
      .select('*')
      .eq('pet_id', id)
      .order('event_date', { ascending: false })

    if (error) setError(error.message)
    setEpisodes(data ?? [])
    setLoading(false)
  }

  const handleAddEpisode = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!title || !eventDate) {
      setFormError('Falta el título o la fecha del evento')
      return
    }

    setSaving(true)

    const { error } = await supabase.from('care_episodes').insert({
      pet_id: id,
      type,
      title,
      description: description || null,
      vet_name: vetName || null,
      clinic_name: clinicName || null,
      event_date: eventDate,
      follow_up_needed: followUpNeeded,
      follow_up_date: followUpNeeded ? followUpDate || null : null,
      status: followUpNeeded ? 'en_seguimiento' : 'cerrado',
    })

    if (error) {
      setFormError(error.message)
      setSaving(false)
      return
    }

    setTitle('')
    setDescription('')
    setVetName('')
    setClinicName('')
    setFollowUpNeeded(false)
    setFollowUpDate('')
    setSaving(false)
    loadAll()
  }

  const statusColor = (status: string) =>
    status === 'cerrado' ? '#3F8557' : status === 'en_seguimiento' ? '#E4A335' : '#6B7267'
  const statusLabel = (status: string) =>
    status === 'cerrado' ? 'Cerrado' : status === 'en_seguimiento' ? 'En seguimiento' : 'Abierto'

  if (loading) return <p className="page-container text-muted">Cargando...</p>

  return (
    <div className="page-container">
      <button onClick={() => router.push(`/pets/${id}`)} className="btn-text text-sm mb-4 block">
        ← Volver a {petName || 'la mascota'}
      </button>
      <p className="eyebrow mb-2">Care Loop</p>
      <h1 className="text-3xl mb-6">Historial de cuidado — {petName}</h1>

      {error && <p className="text-danger text-sm mb-4">{error}</p>}

      {episodes.length === 0 ? (
        <p className="text-muted mb-8">Aún no hay episodios registrados.</p>
      ) : (
        <div className="grid gap-3 mb-8">
          {episodes.map((ep) => (
            <Link key={ep.id} href={`/pets/${id}/episodes/${ep.id}`} className="card hover:border-brand transition-colors block">
              <div className="flex items-center justify-between mb-1">
                <span className="eyebrow">{TYPE_LABELS[ep.type]} · {formatDate(ep.event_date)}</span>
                <StatusPill label={statusLabel(ep.status)} color={statusColor(ep.status)} />
              </div>
              <p className="font-medium text-lg">{ep.title}</p>
              {ep.description && <p className="text-sm text-muted mt-1">{ep.description}</p>}
              {(ep.vet_name || ep.clinic_name) && (
                <p className="text-sm text-muted mt-1">
                  {ep.vet_name}{ep.vet_name && ep.clinic_name ? ' — ' : ''}{ep.clinic_name}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="card">
        <p className="eyebrow mb-4">Registrar episodio</p>
        <form onSubmit={handleAddEpisode}>
          <label className="field-label">Tipo</label>
          <select className="field-input" value={type} onChange={(e) => setType(e.target.value as EpisodeType)}>
            {Object.entries(TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>{label}</option>
            ))}
          </select>

          <label className="field-label">Título</label>
          <input className="field-input" value={title} onChange={(e) => setTitle(e.target.value)} />

          <label className="field-label">Descripción</label>
          <textarea className="field-textarea" value={description} onChange={(e) => setDescription(e.target.value)} />

          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="field-label">Veterinario (opcional)</label>
              <input className="field-input" value={vetName} onChange={(e) => setVetName(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Clínica (opcional)</label>
              <input className="field-input" value={clinicName} onChange={(e) => setClinicName(e.target.value)} />
            </div>
          </div>

          <DateField label="Fecha del evento" value={eventDate} onChange={setEventDate} required />

          <label className="flex items-center gap-2 mb-4 text-sm mt-4">
            <input type="checkbox" checked={followUpNeeded} onChange={(e) => setFollowUpNeeded(e.target.checked)} />
            Requiere seguimiento
          </label>

          {followUpNeeded && (
            <DateField label="Fecha de seguimiento" value={followUpDate} onChange={setFollowUpDate} />
          )}

          {formError && <p className="text-danger text-sm mb-4 mt-4">{formError}</p>}
          <button type="submit" className="btn-primary mt-2" disabled={saving}>
            {saving ? 'Guardando...' : 'Registrar episodio'}
          </button>
        </form>
      </div>
    </div>
  )
}
