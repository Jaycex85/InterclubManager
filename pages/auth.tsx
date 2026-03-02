'use client'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Login utilisateur
  const handleLogin = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) alert(error.message)
    else router.push('/dashboard')
  }

  // Signup utilisateur
  const handleSignup = async () => {
    setLoading(true)
    const { error } = await supabase.auth.signUp({ email, password })
    setLoading(false)
    if (error) alert(error.message)
    else alert('Signup réussi ! Vous pouvez maintenant vous connecter.')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <div className="p-8 rounded-lg bg-gray-800 shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-yellow-500">Login / Signup</h1>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex gap-4">
          <button
            onClick={handleLogin}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-2 rounded font-bold"
            disabled={loading}
          >
            Login
          </button>

          <button
            onClick={handleSignup}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-bold"
            disabled={loading}
          >
            Signup
          </button>
        </div>
      </div>
    </div>
  )
}
