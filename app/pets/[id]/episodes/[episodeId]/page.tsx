'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../../../lib/supabaseClient'
import { StatusPill } from '../../../../../components/ui/StatusPill'
import { DateField } from '../../../../../components/ui/DateField'
import { formatDate } from '../../../../../lib/formatDate'

type Episode = {
  id: string
  type: string
  status: string
  title: string
  description: string | null
  vet_name: string | null
  clinic_name: string | null
  event_date: string
  follow_up_needed: boolean
  follow_up_date: string | null
}

type EpisodeUpdate = {
  id: string
  update_date: string
  note: string
  created_at: string
}

const TYPE_LABELS: Record<string, string> = {
  sintoma: 'Síntoma',
  consulta: 'Consulta',
  vacuna: 'Vacuna',
  tratamiento: 'Tratamiento',
  estudio: 'Estudio',
  cambio_comportamiento: 'Cambio de comportamiento',
  seguimiento: 'Seguimiento',
  urgencia: 'Urgencia',
}

export default function EpisodeDetailPage() {
  const { id, episodeId } = useParams<{ id: string; episodeId: string }>()
  const router = useRouter()

  const [episode, setEpisode] = useState<Episode | null>(null)
  const [updates, setUpdates] = useState<EpisodeUpdate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [note, setNote] = useState('')
  const [updateDate, setUpdateDate] = useState(new Date().toISOString().split('T')[0])
  const [stillNeedsFollowUp, setStillNeedsFollowUp] = useState(true)
  const [newFollowUpDate, setNewFollowUpDate] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  useEffect(() => {
    if (!episodeId) return
    loadAll()
  }, [episodeId])

  const loadAll = async () => {
    setLoading(true)

    const { data: episodeData, error: episodeError } = await supabase
      .from('care_episodes')
      .select('*')
      .eq('id', episodeId)
      .single()

    if (episodeError) {
      setError(episodeError.message)
      setLoading(false)
      return
    }
    setEpisode(episodeData)

    const { data: updatesData } = await supabase
      .from('episode_updates')
      .select('*')
      .eq('episode_id', episodeId)
      .order('update_date', { ascending: true })

    setUpdates(updatesData ?? [])
    setLoading(false)
  }

  const handleAddUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!note) {
      setFormError('Escribe qué pasó en este seguimiento')
      return
    }

    setSaving(true)

    const { error: insertError } = await supabase.from('episode_updates').insert({
      episode_id: episodeId,
      update_date: updateDate,
      note,
    })

    if (insertError) {
      setFormError(insertError.message)
      setSaving(false)
      return
    }

    const { error: updateError } = await supabase
      .from('care_episodes')
      .update({
        status: stillNeedsFollowUp ? 'en_seguimiento' : 'cerrado',
        follow_up_needed: stillNeedsFollowUp,
        follow_up_date: stillNeedsFollowUp ? newFollowUpDate || null : null,
      })
      .eq('id', episodeId)

    if (updateError) {
      setFormError(updateError.message)
      setSaving(false)
      return
    }

    setNote('')
    setNewFollowUpDate('')
    setSaving(false)
    loadAll()
  }

  const handleCloseCase = async () => {
    setSaving(true)
    await supabase
      .from('care_episodes')
      .update({ status: 'cerrado', follow_up_needed: false, follow_up_date: null })
      .eq('id', episodeId)
    setSaving(false)
    loadAll()
  }

  const statusColor = (status: string) =>
    status === 'cerrado' ? '#3F8557' : status === 'en_seguimiento' ? '#E4A335' : '#6B7267'
  const statusLabel = (status: string) =>
    status === 'cerrado' ? 'Cerrado' : status === 'en_seguimiento' ? 'En seguimiento' : 'Abierto'

  if (loading) return <p className="page-container text-muted">Cargando...</p>
  if (error) return <p className="page-container text-danger">{error}</p>
  if (!episode) return <p className="page-container text-muted">Episodio no encontrado</p>

  return (
    <div className="page-container">
      <button onClick={() => router.push(`/pets/${id}/episodes`)} className="btn-text text-sm mb-4 block">
        ← Volver al historial
      </button>

      <div className="card mb-6">
        <div className="flex items-center justify-between mb-2">
          <span className="eyebrow">{TYPE_LABELS[episode.type] ?? episode.type} · {formatDate(episode.event_date)}</span>
          <StatusPill label={statusLabel(episode.status)} color={statusColor(episode.status)} />
        </div>
        <h2 className="text-2xl mb-2">{episode.title}</h2>
        {episode.description && <p className="mb-2">{episode.description}</p>}
        {(episode.vet_name || episode.clinic_name) && (
          <p className="text-muted text-sm mb-2">
            {episode.vet_name}{episode.vet_name && episode.clinic_name ? ' — ' : ''}{episode.clinic_name}
          </p>
        )}
        {episode.follow_up_needed && episode.follow_up_date && (
          <p className="text-warning text-sm font-medium">Próximo seguimiento: {formatDate(episode.follow_up_date)}</p>
        )}
      </div>

      <p className="eyebrow mb-3">Línea de tiempo</p>
      {updates.length === 0 ? (
        <p className="text-muted mb-6">Sin seguimientos registrados todavía.</p>
      ) : (
        <div className="border-l-2 border-border ml-2 mb-6">
          {updates.map((u) => (
            <div key={u.id} className="pl-4 py-3 relative">
              <span className="absolute -left-[5px] top-4 h-2 w-2 rounded-full bg-brand" />
              <p className="font-mono text-xs text-muted">{formatDate(u.update_date)}</p>
              <p className="mt-1">{u.note}</p>
            </div>
          ))}
        </div>
      )}

      {episode.status !== 'cerrado' && (
        <div className="card">
          <p className="eyebrow mb-4">Agregar seguimiento</p>
          <form onSubmit={handleAddUpdate}>
            <DateField label="Fecha" value={updateDate} onChange={setUpdateDate} />

            <label className="field-label">¿Qué pasó?</label>
            <textarea className="field-textarea" value={note} onChange={(e) => setNote(e.target.value)} />

            <label className="flex items-center gap-2 mb-4 text-sm">
              <input type="checkbox" checked={stillNeedsFollowUp} onChange={(e) => setStillNeedsFollowUp(e.target.checked)} />
              Todavía requiere más seguimiento
            </label>

            {stillNeedsFollowUp && (
              <DateField label="Próxima fecha de seguimiento" value={newFollowUpDate} onChange={setNewFollowUpDate} />
            )}

            {formError && <p className="text-danger text-sm mb-4 mt-4">{formError}</p>}

            <div className="flex items-center gap-3 mb-4 mt-2">
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar seguimiento'}
              </button>
              {!stillNeedsFollowUp && (
                <span className="text-success text-sm">Al guardar, este caso se cerrará</span>
              )}
            </div>
          </form>

          <button onClick={handleCloseCase} disabled={saving} className="btn-secondary text-sm">
            Cerrar caso sin agregar nota
          </button>
        </div>
      )}
    </div>
  )
}
