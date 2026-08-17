'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

type Profile = {
  full_name: string
  phone: string
  address: string
  emergency_contact_name: string
  emergency_contact_phone: string
}

const EMPTY_PROFILE: Profile = {
  full_name: '',
  phone: '',
  address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
}

export default function ProfilePage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [profile, setProfile] = useState<Profile>(EMPTY_PROFILE)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      router.push('/login')
      return
    }

    setEmail(user.email ?? '')

    const { data } = await supabase
      .from('profiles')
      .select('full_name, phone, address, emergency_contact_name, emergency_contact_phone')
      .eq('id', user.id)
      .maybeSingle()

    if (data) setProfile(data)
    setLoading(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    setSaved(false)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('profiles')
      .upsert({ id: user.id, ...profile, updated_at: new Date().toISOString() })

    if (error) {
      setError(error.message)
    } else {
      setSaved(true)
    }
    setSaving(false)
  }

  if (loading) return <p className="page-container text-muted">Cargando...</p>

  return (
    <div className="page-container">
      <button onClick={() => router.push('/pets')} className="btn-text text-sm mb-6 block">
        ← Mis mascotas
      </button>

      <p className="eyebrow mb-2">Mi perfil</p>
      <h1 className="text-3xl mb-6">Datos del dueño</h1>

      <div className="card">
        <label className="field-label">Correo</label>
        <input className="field-input bg-bg" value={email} disabled />

        <form onSubmit={handleSave}>
          <label className="field-label">Nombre completo</label>
          <input
            className="field-input"
            value={profile.full_name}
            onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
          />

          <label className="field-label">Teléfono</label>
          <input
            className="field-input"
            value={profile.phone}
            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
          />

          <label className="field-label">Dirección</label>
          <textarea
            className="field-textarea"
            value={profile.address}
            onChange={(e) => setProfile({ ...profile, address: e.target.value })}
          />

          <p className="eyebrow mt-2 mb-3">Contacto de emergencia alterno</p>
          <div className="grid grid-cols-2 gap-x-4">
            <div>
              <label className="field-label">Nombre</label>
              <input
                className="field-input"
                value={profile.emergency_contact_name}
                onChange={(e) => setProfile({ ...profile, emergency_contact_name: e.target.value })}
              />
            </div>
            <div>
              <label className="field-label">Teléfono</label>
              <input
                className="field-input"
                value={profile.emergency_contact_phone}
                onChange={(e) => setProfile({ ...profile, emergency_contact_phone: e.target.value })}
              />
            </div>
          </div>

          {error && <p className="text-danger text-sm mb-4">{error}</p>}
          {saved && <p className="text-success text-sm mb-4">Guardado correctamente</p>}

          <button type="submit" className="btn-primary" disabled={saving}>
            {saving ? 'Guardando...' : 'Guardar cambios'}
          </button>
        </form>
      </div>
    </div>
  )
}
