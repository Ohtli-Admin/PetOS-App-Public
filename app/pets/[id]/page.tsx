'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { supabase } from '../../../lib/supabaseClient'
import { StatusPill } from '../../../components/ui/StatusPill'

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

export default function PetDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()

  const [pet, setPet] = useState<Pet | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [catalog, setCatalog] = useState<VaccineCatalogItem[]>([])
  const [vaccines, setVaccines] = useState<PetVaccine[]>([])

  const [selectedCatalogId, setSelectedCatalogId] = useState('')
  const [customName, setCustomName] = useState('')
  const [dateAdministered, setDateAdministered] = useState('')
  const [nextDueDate, setNextDueDate] = useState('')
  const [vaccineNotes, setVaccineNotes] = useState('')
  const [vaccineFile, setVaccineFile] = useState<File | null>(null)
  const [vaccineSaving, setVaccineSaving] = useState(false)
  const [vaccineError, setVaccineError] = useState('')

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
      })
      .eq('id', pet.id)

    if (error) setError(error.message)
    setSaving(false)
  }

  const suggestNextDate = (baseDate: string, months: number) => {
    const d = new Date(baseDate)
    d.setMonth(d.getMonth() + months)
    setNextDueDate(d.toISOString().split('T')[0])
  }

  const handleCatalogChange = (catalogId: string) => {
    setSelectedCatalogId(catalogId)
    const item = catalog.find((c) => c.id === catalogId)
    if (item?.default_interval_months && dateAdministered) {
      suggestNextDate(dateAdministered, item.default_interval_months)
    }
  }

  const handleDateChange = (value: string) => {
    setDateAdministered(value)
    const item = catalog.find((c) => c.id === selectedCatalogId)
    if (item?.default_interval_months && value) {
      suggestNextDate(value, item.default_interval_months)
    }
  }

  const handleAddVaccine = async (e: React.FormEvent) => {
    e.preventDefault()
    setVaccineError('')

    const catalogItem = catalog.find((c) => c.id === selectedCatalogId)
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
        vaccine_catalog_id: selectedCatalogId || null,
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

    setSelectedCatalogId('')
    setCustomName('')
    setDateAdministered('')
    setNextDueDate('')
    setVaccineNotes('')
    setVaccineFile(null)
    setVaccineSaving(false)
    loadAll()
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
            <div>
              <label className="field-label">Fecha de nacimiento</label>
              <input type="date" className="field-input" value={pet.birth_date ?? ''} onChange={(e) => setPet({ ...pet, birth_date: e.target.value })} />
            </div>
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
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
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
                  Aplicada: {v.date_administered}
                  {v.next_due_date && <> · Próxima: {v.next_due_date}</>}
                </p>
                {v.notes && <p className="text-sm mt-1">{v.notes}</p>}
              </div>
            )
          })}
        </div>
      )}

      <div className="card">
        <p className="eyebrow mb-4">Registrar vacuna</p>
        <form onSubmit={handleAddVaccine}>
          <label className="field-label">Vacuna (catálogo)</label>
          <select className="field-input" value={selectedCatalogId} onChange={(e) => handleCatalogChange(e.target.value)}>
            <option value="">-- Personalizada --</option>
            {catalog.filter((c) => c.species === pet.species || !pet.species).map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {!selectedCatalogId && (
            <>
              <label className="field-label">Nombre de la vacuna</label>
              <input className="field-input" value={customName} onChange={(e) => setCustomName(e.target.value)} />
            </>
          )}

          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="field-label">Fecha aplicada</label>
              <input type="date" className="field-input" value={dateAdministered} onChange={(e) => handleDateChange(e.target.value)} />
            </div>
            <div>
              <label className="field-label">Próxima dosis (sugerida)</label>
              <input type="date" className="field-input" value={nextDueDate} onChange={(e) => setNextDueDate(e.target.value)} />
            </div>
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
