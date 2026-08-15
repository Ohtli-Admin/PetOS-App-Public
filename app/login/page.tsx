'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '../../lib/supabaseClient'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    const { error } = isSignUp
      ? await supabase.auth.signUp({ email, password })
      : await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      return
    }

    router.push('/pets')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <p className="eyebrow mb-2 text-center">PetOS</p>
        <h1 className="text-3xl text-center mb-8">
          {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
        </h1>
        <div className="card">
          <form onSubmit={handleSubmit}>
            <label className="field-label">Correo</label>
            <input
              type="email"
              className="field-input"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <label className="field-label">Contraseña</label>
            <input
              type="password"
              className="field-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {error && <p className="text-danger text-sm mb-4">{error}</p>}
            <button type="submit" className="btn-primary w-full">
              {isSignUp ? 'Registrarme' : 'Entrar'}
            </button>
          </form>
        </div>
        <button
          onClick={() => setIsSignUp(!isSignUp)}
          className="btn-text text-sm mt-4 block mx-auto"
        >
          {isSignUp ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Regístrate'}
        </button>
      </div>
    </div>
  )
}
