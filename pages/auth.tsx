// pages/auth.tsx
import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useRouter } from 'next/router'

export default function AuthPage() {
  const router = useRouter()
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // Vérifier session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) router.push('/dashboard')
    })
  }, [])

  // Login
  const handleLogin = async () => {
    setLoading(true)
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setMessage(error.message)
    else router.push('/dashboard')
  }

  // Signup (Admin only)
  const handleSignup = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true
      })
      if (error) setMessage(error.message)
      else setMessage('Utilisateur créé avec succès !')
    } catch (err: any) {
      setMessage(err.message)
    }
    setLoading(false)
  }

  // Logout
  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 p-4">
      <div className="w-full max-w-md bg-blue-900 p-6 rounded-lg shadow-lg text-gray-100">
        <h1 className="text-2xl font-bold mb-4">{authMode === 'login' ? 'Login' : 'Créer un compte'}</h1>

        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-3 rounded mb-3 bg-gray-800 text-gray-100 placeholder-gray-400"
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-3 rounded mb-3 bg-gray-800 text-gray-100 placeholder-gray-400"
        />

        {message && <p className="mb-3 text-yellow-400">{message}</p>}

        {authMode === 'login' ? (
          <button
            onClick={handleLogin}
            className="w-full bg-yellow-700 hover:bg-yellow-600 p-3 rounded font-bold mb-2"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Se connecter'}
          </button>
        ) : (
          <button
            onClick={handleSignup}
            className="w-full bg-yellow-700 hover:bg-yellow-600 p-3 rounded font-bold mb-2"
            disabled={loading}
          >
            {loading ? 'Création...' : 'Créer utilisateur'}
          </button>
        )}

        <p className="text-gray-400 text-center mt-2 cursor-pointer" onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}>
          {authMode === 'login' ? "Créer un compte" : "Retourner au login"}
        </p>

        {/* Logout button (visible si session détectée) */}
        {authMode === 'login' && (
          <button
            onClick={handleLogout}
            className="w-full mt-4 bg-red-600 hover:bg-red-500 p-3 rounded font-bold"
          >
            Logout
          </button>
        )}
      </div>
    </div>
  )
}
