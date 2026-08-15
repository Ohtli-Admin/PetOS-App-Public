'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { supabase } from '../../lib/supabaseClient'

type Pet = {
  id: string
  name: string
  species: string
  breed: string | null
  created_at: string
}

export default function PetsPage() {
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [pets, setPets] = useState<Pet[]>([])
  const [name, setName] = useState('')
  const [species, setSpecies] = useState('')
  const [breed, setBreed] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        router.push('/login')
      } else {
        setUserEmail(session.user.email ?? null)
        fetchPets()
      }
    })
  }, [router])

  const fetchPets = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('pets')
      .select('id, name, species, breed, created_at')
      .order('created_at', { ascending: false })

    if (error) setError(error.message)
    else setPets(data ?? [])
    setLoading(false)
  }

  const handleAddPet = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase.from('pets').insert({
      owner_id: user.id,
      name,
      species,
      breed: breed || null,
    })

    if (error) {
      setError(error.message)
      return
    }

    setName('')
    setSpecies('')
    setBreed('')
    fetchPets()
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (!userEmail) return <p className="page-container text-muted">Cargando...</p>

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <div>
          <p className="eyebrow mb-1">Sesión activa</p>
          <p className="text-ink">{userEmail}</p>
        </div>
        <button onClick={handleLogout} className="btn-text text-sm">Cerrar sesión</button>
      </div>

      <h1 className="text-3xl mb-6">Mis mascotas</h1>

      {loading ? (
        <p className="text-muted">Cargando mascotas...</p>
      ) : pets.length === 0 ? (
        <div className="card mb-8">
          <p className="text-muted">Aún no has registrado ninguna mascota. Agrega la primera abajo.</p>
        </div>
      ) : (
        <div className="grid gap-3 mb-8">
          {pets.map((pet) => (
            <Link key={pet.id} href={`/pets/${pet.id}`} className="card hover:border-brand transition-colors flex items-center justify-between">
              <div>
                <p className="text-xl font-display">{pet.name}</p>
                <p className="eyebrow mt-1">{pet.species}{pet.breed ? ` · ${pet.breed}` : ''}</p>
              </div>
              <span className="text-muted">→</span>
            </Link>
          ))}
        </div>
      )}

      <div className="card">
        <p className="eyebrow mb-4">Agregar mascota</p>
        <form onSubmit={handleAddPet}>
          <label className="field-label">Nombre</label>
          <input
            className="field-input"
            placeholder="Rocky"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <label className="field-label">Especie</label>
          <input
            className="field-input"
            placeholder="Perro, gato..."
            value={species}
            onChange={(e) => setSpecies(e.target.value)}
            required
          />
          <label className="field-label">Raza (opcional)</label>
          <input
            className="field-input"
            placeholder="Husky, Pitbull..."
            value={breed}
            onChange={(e) => setBreed(e.target.value)}
          />
          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          <button type="submit" className="btn-primary w-full">Guardar mascota</button>
        </form>
      </div>
    </div>
  )
}
