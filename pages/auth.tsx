'use client'
import { useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../utils/supabaseClient'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const router = useRouter()

  // Fonction pour vérifier le profil utilisateur après login
  const verifyUserProfile = async (userId: string): Promise<boolean> => {
    try {
      const { data: userProfile, error } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', userId)
        .single()

      if (error || !userProfile) {
        console.error('Profil utilisateur introuvable:', error)
        setErrorMessage('Profil utilisateur non trouvé. Veuillez contacter l\'administrateur.')
        return false
      }

      console.log('Profil utilisateur trouvé:', userProfile)
      return true
    } catch (err) {
      console.error('Erreur lors de la vérification du profil:', err)
      setErrorMessage('Une erreur est survenue lors de la vérification du profil.')
      return false
    }
  }

  // Login utilisateur
  const handleLogin = async () => {
    setErrorMessage('')
    setLoading(true)

    try {
      // Effectue la connexion
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        console.error('Erreur de connexion:', authError.message)
        setErrorMessage(authError.message || 'Erreur lors de la connexion')
        setLoading(false)
        return
      }

      if (!authData.user) {
        setErrorMessage('Erreur: utilisateur non authentifié')
        setLoading(false)
        return
      }

      // Vérifier que le profil existe
      const profileExists = await verifyUserProfile(authData.user.id)

      if (!profileExists) {
        // Déconnecte l'utilisateur si le profil n'existe pas
        await supabase.auth.signOut()
        setLoading(false)
        return
      }

      // Revalide la session
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        console.log('Session confirmée, redirection...')
        // Redirection vers le dashboard principal
        // La logique de redirection selon le rôle se fera dans pages/index.tsx
        router.push('/dashboard')
      } else {
        setErrorMessage('Erreur: session non établie')
        setLoading(false)
      }
    } catch (err) {
      console.error('Erreur lors du login:', err)
      setErrorMessage('Une erreur inattendue s\'est produite lors de la connexion.')
      setLoading(false)
    }
  }

  // Signup utilisateur
  const handleSignup = async () => {
    setErrorMessage('')
    setLoading(true)

    if (!email || !password) {
      setErrorMessage('Veuillez remplir tous les champs')
      setLoading(false)
      return
    }

    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        console.error('Erreur de signup:', error.message)
        setErrorMessage(error.message || 'Erreur lors du signup')
        setLoading(false)
        return
      }

      if (authData.user) {
        console.log('Utilisateur créé:', authData.user.id)
        setErrorMessage('')
        setEmail('')
        setPassword('')
        alert('Signup réussi ! Un administrateur doit créer votre profil avant que vous puissiez vous connecter. Veuillez contacter le support.')
      }
    } catch (err) {
      console.error('Erreur lors du signup:', err)
      setErrorMessage('Une erreur inattendue s\'est produite lors du signup.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <div className="p-8 rounded-lg bg-gray-800 shadow-md w-full max-w-md">
        <h1 className="text-2xl font-bold mb-6 text-yellow-500">Login / Signup</h1>

        {errorMessage && (
          <div className="mb-4 p-3 bg-red-600 text-white rounded text-sm">
            {errorMessage}
          </div>
        )}

        <input
          type="email"
          placeholder="Email"
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          disabled={loading}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-2 mb-4 rounded bg-gray-700 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          disabled={loading}
        />

        <div className="flex gap-4">
          <button
            onClick={handleLogin}
            className="flex-1 bg-yellow-600 hover:bg-yellow-700 py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Connexion...' : 'Login'}
          </button>

          <button
            onClick={handleSignup}
            className="flex-1 bg-gray-600 hover:bg-gray-700 py-2 rounded font-bold disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={loading}
          >
            {loading ? 'Inscription...' : 'Signup'}
          </button>
        </div>
      </div>
    </div>
  )
}