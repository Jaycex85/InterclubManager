import { useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/router'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const router = useRouter()

  const handleLogin = async () => {
    const { error, data } = await supabase.auth.signInWithPassword({ email, password })
    if (!error) router.push('/dashboard')
  }

  const handleSignup = async () => {
    const { error } = await supabase.auth.signUp({ email, password })
    if (!error) alert('Check your email to confirm')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy text-gray-100">
      <div className="p-6 rounded-lg shadow-lg bg-gray-800 w-80">
        <h2 className="text-2xl font-bold mb-4 text-yellow-600">Connexion</h2>
        <input
          className="w-full mb-2 p-2 rounded bg-gray-700"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          className="w-full mb-2 p-2 rounded bg-gray-700"
          type="password"
          placeholder="Mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
        <button
          onClick={handleLogin}
          className="w-full bg-yellow-600 p-2 rounded mb-2"
        >
          Se connecter
        </button>
        <button
          onClick={handleSignup}
          className="w-full bg-gray-600 p-2 rounded"
        >
          S'inscrire
        </button>
      </div>
    </div>
  )
}
