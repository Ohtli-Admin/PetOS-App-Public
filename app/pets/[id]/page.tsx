'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { StatusPill } from '../../../components/ui/StatusPill'
import { DateField } from '../../../components/ui/DateField'
import { formatDate } from '../../../lib/formatDate'

type Pet = {
  id: string
  name: string
  species: string
  breed: string | null
  birth_date: string | null
  sex: string | null
  weight_kg: number | null
  allergies: string | null
  notes: string | null
  regular_vet_name: string | null
  emergency_vet_phone: string | null
}

type VaccineCatalogItem = {
  id: string
  species: string
  name: string
  default_interval_months: number | null
}

type PetVaccine = {
  id: string
  vaccine_name: string
  date_administered: string
  next_due_date: string | null
  notes: string | null
}

type Medication = {
  id: string
  name: string
  dose: string | null
  frequency: string
  start_date: string
  end_date: string | null
  wants_reminder: boolean
  notes: string | null
}

const EXPIRATION_OPTIONS = [
  { label: '24 horas', hours: 24 },
  { label: '3 días', hours: 72 },
  { label: '7 días', hours: 168 },
  { label: 'Sin expiración', hours: null },
]

const OTHER_VACCINE_VALUE = '__otra__'

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [catalog, setCatalog] = useState<VaccineCatalogItem[]>([])
  const [vaccines, setVaccines] = useState<PetVaccine[]>([])

  const [selectedOption, setSelectedOption] = useState('')
  const [customName, setCustomName] = useState('')
  const [dateAdministered, setDateAdministered] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [vaccineNotes, setVaccineNotes] = useState('')
  const [vaccineFile, setVaccineFile] = useState<File | null>(null)
  const [vaccineSaving, setVaccineSaving] = useState(false)
  const [vaccineError, setVaccineError] = useState('')

  const [medications, setMedications] = useState<Medication[]>([])
  const [medName, setMedName] = useState('')
  const [medDose, setMedDose] = useState('')
  const [medFrequency, setMedFrequency] = useState('')
  const [medStartDate, setMedStartDate] = useState(new Date().toISOString().split('T')[0])
  const [medEndDate, setMedEndDate] = useState('')
  const [medWantsReminder, setMedWantsReminder] = useState(false)
  const [medNotes, setMedNotes] = useState('')
  const [medSaving, setMedSaving] = useState(false)
  const [medError, setMedError] = useState('')

  const [shareExpiration, setShareExpiration] = useState(EXPIRATION_OPTIONS[1].label)
  const [shareUrl, setShareUrl] = useState('')
  const [shareLoading, setShareLoading] = useState(false)
  const [shareCopied, setShareCopied] = useState(false)

  useEffect(() => {
    if (!id) return
    loadAll()
  }, [id])

  const loadAll = async () => {
    setLoading(true)
    const { data: petData, error: petError } = await supabase
      .from('pets')
      .select('*')
      .eq('id', id)
      .single()

    if (petError) {
      setError(petError.message)
      setLoading(false)
      return
    }
    setPet(petData)

    const { data: catalogData } = await supabase
      .from('vaccine_catalog')
      .select('id, species, name, default_interval_months')
      .order('name')
    setCatalog(catalogData ?? [])

    const { data: vaccineData } = await supabase
      .from('pet_vaccines')
      .select('id, vaccine_name, date_administered, next_due_date, notes')
      .eq('pet_id', id)
      .order('next_due_date', { ascending: true })
    setVaccines(vaccineData ?? [])

    const { data: medicationData } = await supabase
      .from('pet_medications')
      .select('id, name, dose, frequency, start_date, end_date, wants_reminder, notes')
      .eq('pet_id', id)
      .order('start_date', { ascending: false })
    setMedications(medicationData ?? [])

    setLoading(false)
  }

  const handleSavePet = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pet) return
    setSaving(true)
    setError('')

    const { error } = await supabase
      .from('pets')
      .update({
        name: pet.name,
        species: pet.species,
        breed: pet.breed,
        birth_date: pet.birth_date || null,
        sex: pet.sex,
        weight_kg: pet.weight_kg,
        allergies: pet.allergies,
        notes: pet.notes,
        regular_vet_name: pet.regular_vet_name,
        emergency_vet_phone: pet.emergency_vet_phone,
      })
      .eq('id', pet.id)

    if (error) setError(error.message)
    setSaving(false)
  }

  const matchingCatalog = catalog.filter(
    (c) => pet && c.species.trim().toLowerCase() === pet.species.trim().toLowerCase()
  )

  const suggestNextDate = (baseDate: string, months: number) => {
    const d = new Date(baseDate)
    d.setMonth(d.getMonth() + months)
    setNextDueDate(d.toISOString().split('T')[0])
  }

  const handleOptionChange = (value: string) => {
    setSelectedOption(value)
    if (value === OTHER_VACCINE_VALUE) return
    const item = matchingCatalog.find((c) => c.id === value)
    if (item?.default_interval_months && dateAdministered) {
      suggestNextDate(dateAdministered, item.default_interval_months)
    }
  }

  const handleDateChange = (value: string) => {
    setDateAdministered(value)
    const item = matchingCatalog.find((c) => c.id === selectedOption)
    if (item?.default_interval_months && value) {
      suggestNextDate(value, item.default_interval_months)
    }
  }

  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault()
    setVaccineError('')

    const catalogItem = matchingCatalog.find((c) => c.id === selectedOption)
    const vaccineName = catalogItem ? catalogItem.name : customName

    if (!vaccineName || !dateAdministered) {
      setVaccineError('Falta el nombre de la vacuna o la fecha aplicada')
      return
    }

    setVaccineSaving(true)

    const { data: newVaccine, error } = await supabase
      .from('pet_vaccines')
      .insert({
        pet_id: id,
        vaccine_catalog_id: catalogItem ? catalogItem.id : null,
        vaccine_name: vaccineName,
        date_administered: dateAdministered,
        next_due_date: nextDueDate || null,
        notes: vaccineNotes || null,
      })
      .select()
      .single()

    if (error) {
      setVaccineError(error.message)
      setVaccineSaving(false)
      return
    }

    if (vaccineFile && newVaccine) {
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        const filePath = `${user.id}/${id}/${newVaccine.id}-${vaccineFile.name}`
        const { error: uploadError } = await supabase.storage
          .from('pet-documents')
          .upload(filePath, vaccineFile)

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('pet-documents')
            .getPublicUrl(filePath)

          await supabase.from('documents').insert({
            pet_id: id,
            vaccine_id: newVaccine.id,
            type: 'vacuna',
            file_url: publicUrlData.publicUrl,
            document_date: dateAdministered,
          })
        }
      }
    }

    setSelectedOption('')
    setCustomName('')
    setDateAdministered('')
    setNextDueDate('')
    setVaccineNotes('')
    setVaccineFile(null)
    setVaccineSaving(false)
    loadAll()
  }

  const handleAddMedication = async (e: React.FormEvent) => {
    e.preventDefault()
    setMedError('')

    if (!medName || !medFrequency || !medStartDate) {
      setMedError('Falta el nombre, la frecuencia o la fecha de inicio')
      return
    }

    setMedSaving(true)

    const { error } = await supabase.from('pet_medications').insert({
      pet_id: id,
      name: medName,
      dose: medDose || null,
      frequency: medFrequency,
      start_date: medStartDate,
      end_date: medEndDate || null,
      wants_reminder: medWantsReminder,
      notes: medNotes || null,
    })

    if (error) {
      setMedError(error.message)
      setMedSaving(false)
      return
    }

    setMedName('')
    setMedDose('')
    setMedFrequency('')
    setMedStartDate(new Date().toISOString().split('T')[0])
    setMedEndDate('')
    setMedWantsReminder(false)
    setMedNotes('')
    setMedSaving(false)
    loadAll()
  }

  const handleCreateShareLink = async () => {
    setShareLoading(true)
    setShareUrl('')
    setShareCopied(false)

    const option = EXPIRATION_OPTIONS.find((o) => o.label === shareExpiration)
    const expiresAt = option?.hours
      ? new Date(Date.now() + option.hours * 60 * 60 * 1000).toISOString()
      : null

    const token = crypto.randomUUID().replace(/-/g, '')

    const { error } = await supabase.from('pet_share_links').insert({
      pet_id: id,
      token,
      expires_at: expiresAt,
    })

    if (!error) {
      setShareUrl(`${window.location.origin}/share/${token}`)
    }
    setShareLoading(false)
  }

  const handleCopyShareUrl = () => {
    navigator.clipboard.writeText(shareUrl)
    setShareCopied(true)
  }

  const getVaccineStatus = (nextDue: string | null) => {
    if (!nextDue) return { label: 'Sin programar', color: '#6B7267' }
    const today = new Date()
    const due = new Date(nextDue)
    const diffDays = Math.floor((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays < 0) return { label: 'Vencida', color: '#C1503E' }
    if (diffDays <= 30) return { label: 'Próxima', color: '#E4A335' }
    return { label: 'Vigente', color: '#3F8557' }
  }

  const getMedicationStatus = (endDate: string | null) => {
    if (!endDate) return { label: 'Activo', color: '#3F8557' }
    const today = new Date().toISOString().split('T')[0]
    return endDate >= today
      ? { label: 'Activo', color: '#3F8557' }
      : { label: 'Finalizado', color: '#6B7267' }
  }

  if (loading) return <p className="page-container text-muted">Cargando...</p>
  if (error) return <p className="page-container text-danger">{error}</p>
  if (!pet) return <p className="page-container text-muted">Mascota no encontrada</p>

  return (
    <div className="page-container">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push('/pets')} className="btn-text text-sm">← Mis mascotas</button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => router.push(`/pets/${id}/episodes`)} className="btn-secondary text-sm">
            Historial de cuidado
          </button>
          <button
            onClick={() => router.push(`/pets/${id}/sos`)}
            className="text-sm font-medium text-white bg-danger hover:bg-danger/90 rounded-lg px-4 py-2 transition-colors"
          >
            SOS
          </button>
        </div>
      </div>

      <div className="card mb-8">
        <p className="eyebrow mb-2">Passport · {pet.species}</p>
        <h1 className="text-4xl mb-6">{pet.name}</h1>

        <form onSubmit={handleSavePet}>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="field-label">Nombre</label>
              <input className="field-input" value={pet.name} onChange={(e) => setPet({ ...pet, name: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Especie</label>
              <input className="field-input" value={pet.species} onChange={(e) => setPet({ ...pet, species: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Raza</label>
              <input className="field-input" value={pet.breed ?? ''} onChange={(e) => setPet({ ...pet, breed: e.target.value })} />
            </div>
            <DateField
              label="Fecha de nacimiento"
              value={pet.birth_date ?? ''}
              onChange={(v) => setPet({ ...pet, birth_date: v })}
            />
            <div>
              <label className="field-label">Sexo</label>
              <select className="field-input" value={pet.sex ?? ''} onChange={(e) => setPet({ ...pet, sex: e.target.value })}>
                <option value="">Selecciona</option>
                <option value="macho">Macho</option>
                <option value="hembra">Hembra</option>
                <option value="desconocido">Desconocido</option>
              </select>
            </div>
            <div>
              <label className="field-label">Peso (kg)</label>
              <input type="number" step="0.01" className="field-input" value={pet.weight_kg ?? ''} onChange={(e) => setPet({ ...pet, weight_kg: e.target.value ? parseFloat(e.target.value) : null })} />
            </div>
          </div>
          <label className="field-label">Alergias</label>
          <textarea className="field-textarea" value={pet.allergies ?? ''} onChange={(e) => setPet({ ...pet, allergies: e.target.value })} />
          <label className="field-label">Notas</label>
          <textarea className="field-textarea" value={pet.notes ?? ''} onChange={(e) => setPet({ ...pet, notes: e.target.value })} />

          <p className="eyebrow mt-2 mb-3">Veterinario de confianza (opcional)</p>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="field-label">Nombre</label>
              <input className="field-input" value={pet.regular_vet_name ?? ''} onChange={(e) => setPet({ ...pet, regular_vet_name: e.target.value })} />
            </div>
            <div>
              <label className="field-label">Teléfono</label>
              <input className="field-input" value={pet.emergency_vet_phone ?? ''} onChange={(e) => setPet({ ...pet, emergency_vet_phone: e.target.value })} />
            </div>
          </div>

          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>

      <p className="eyebrow mb-3">Compartir con un cuidador</p>
      <div className="card mb-8">
        <p className="text-sm text-muted mb-4">
          Genera un enlace de solo lectura con la ficha de {pet.name} — sin dar acceso a tu cuenta ni contraseña.
        </p>
        <div className="flex gap-2 mb-3">
          <select
            className="field-input mb-0"
            value={shareExpiration}
            onChange={(e) => setShareExpiration(e.target.value)}
          >
            {EXPIRATION_OPTIONS.map((o) => (
              <option key={o.label} value={o.label}>{o.label}</option>
            ))}
          </select>
          <button onClick={handleCreateShareLink} className="btn-primary whitespace-nowrap" disabled={shareLoading}>
            {shareLoading ? 'Generando...' : 'Generar enlace'}
          </button>
        </div>
        {shareUrl && (
          <div className="flex gap-2 items-center">
            <input className="field-input mb-0 font-mono text-sm" value={shareUrl} readOnly />
            <button onClick={handleCopyShareUrl} className="btn-secondary whitespace-nowrap">
              {shareCopied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        )}
      </div>

      <p className="eyebrow mb-3">Medicamentos</p>

      {medications.length === 0 ? (
        <p className="text-muted mb-6">Sin medicamentos registrados todavía.</p>
      ) : (
        <div className="grid gap-3 mb-6">
          {medications.map((m) => {
            const status = getMedicationStatus(m.end_date)
            return (
              <div key={m.id} className="card py-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{m.name}{m.dose ? ` · ${m.dose}` : ''}</p>
                  <StatusPill label={status.label} color={status.color} />
                </div>
                <p className="text-sm text-muted">{m.frequency}</p>
                <p className="text-sm text-muted font-mono">
                  Desde: {formatDate(m.start_date)}
                  {m.end_date && <> · Hasta: {formatDate(m.end_date)}</>}
                </p>
                {m.wants_reminder && (
                  <p className="text-xs text-warning mt-1">🔔 Recordatorio solicitado (próximamente)</p>
                )}
                {m.notes && <p className="text-sm mt-1">{m.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      <div className="card mb-8">
        <p className="eyebrow mb-4">Registrar medicamento</p>
        <form onSubmit={handleAddMedication}>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="field-label">Nombre del medicamento</label>
              <input className="field-input" value={medName} onChange={(e) => setMedName(e.target.value)} placeholder="Ej. Apoquel" />
            </div>
            <div>
              <label className="field-label">Dosis</label>
              <input className="field-input" value={medDose} onChange={(e) => setMedDose(e.target.value)} placeholder="Ej. 16 mg" />
            </div>
          </div>

          <label className="field-label">Frecuencia</label>
          <input className="field-input" value={medFrequency} onChange={(e) => setMedFrequency(e.target.value)} placeholder="Ej. Cada 12 horas, 1 vez al día..." />

          <div className="grid grid-cols-2 gap-x-4">
            <DateField label="Fecha de inicio" value={medStartDate} onChange={setMedStartDate} required />
            <DateField label="Fecha de fin (opcional)" value={medEndDate} onChange={setMedEndDate} />
          </div>

          <label className="flex items-center gap-2 mb-4 text-sm mt-4">
            <input type="checkbox" checked={medWantsReminder} onChange={(e) => setMedWantsReminder(e.target.checked)} />
            Quiero recordatorio para este medicamento
          </label>
          {medWantsReminder && (
            <p className="text-xs text-muted -mt-3 mb-4">
              Guardamos tu solicitud — los recordatorios automáticos llegarán en una próxima actualización de PetOS.
            </p>
          )}

          <label className="field-label">Notas</label>
          <input className="field-input" value={medNotes} onChange={(e) => setMedNotes(e.target.value)} />

          {medError && <p className="text-danger text-sm mb-4">{medError}</p>}
          <button type="submit" className="btn-primary" disabled={medSaving}>
            {medSaving ? 'Guardando...' : 'Registrar medicamento'}
          </button>
        </form>
      </div>

      <p className="eyebrow mb-3">Cartilla de vacunación</p>

      {vaccines.length === 0 ? (
        <p className="text-muted mb-6">Sin vacunas registradas todavía.</p>
      ) : (
        <div className="grid gap-3 mb-6">
          {vaccines.map((v) => {
            const status = getVaccineStatus(v.next_due_date)
            return (
              <div key={v.id} className="card py-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium">{v.vaccine_name}</p>
                  <StatusPill label={status.label} color={status.color} />
                </div>
                <p className="text-sm text-muted font-mono">
                  Aplicada: {formatDate(v.date_administered)}
                  {v.next_due_date && <> · Próxima: {formatDate(v.next_due_date)}</>}
                </p>
                {v.notes && <p className="text-sm mt-1">{v.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      <div className="card">
        <p className="eyebrow mb-1">Registrar vacuna</p>
        <p className="text-sm text-muted mb-4">
          Elige una vacuna de la lista si aparece; si no la encuentras, selecciona "Otra" y escribe el nombre tú mismo.
        </p>
        <form onSubmit={handleAddVaccine}>
          <label className="field-label">Vacuna</label>
          <select className="field-input" value={selectedOption} onChange={(e) => handleOptionChange(e.target.value)}>
            <option value="">Selecciona una vacuna...</option>
            {matchingCatalog.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value={OTHER_VACCINE_VALUE}>Otra (escribir el nombre)</option>
          </select>

          {matchingCatalog.length === 0 && (
            <p className="text-xs text-muted -mt-2 mb-4">
              Todavía no tenemos vacunas precargadas para "{pet.species}" — usa "Otra" para escribirla tú mismo.
            </p>
          )}

          {selectedOption === OTHER_VACCINE_VALUE && (
            <>
              <label className="field-label">Nombre de la vacuna</label>
              <input className="field-input" value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Ej. Rabia" />
            </>
          )}

          <div className="grid grid-cols-2 gap-x-4">
            <DateField label="Fecha aplicada" value={dateAdministered} onChange={handleDateChange} />
            <DateField label="Próxima dosis (sugerida)" value={nextDueDate} onChange={setNextDueDate} />
          </div>

          <label className="field-label">Notas</label>
          <input className="field-input" value={vaccineNotes} onChange={(e) => setVaccineNotes(e.target.value)} />

          <label className="field-label">Foto o documento (opcional)</label>
          <input type="file" accept="image/*,.pdf" className="field-input" onChange={(e) => setVaccineFile(e.target.files?.[0] ?? null)} />

          {vaccineError && <p className="text-danger text-sm mb-4">{vaccineError}</p>}
          <button type="submit" className="btn-primary" disabled={vaccineSaving}>
            {vaccineSaving ? 'Guardando...' : 'Registrar vacuna'}
          </button>
        </form>
      </div>
    </div>
  )
}
