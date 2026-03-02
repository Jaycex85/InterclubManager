"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SetPassword() {
  const router = useRouter()
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [token, setToken] = useState("")

  useEffect(() => {
    if (router.query.token) {
      setToken(router.query.token as string)
    }
  }, [router.query])

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Mise à jour du mot de passe avec le token d’invitation
    const { error } = await supabase.auth.updateUser({ 
      password,
      // Si nécessaire, ajouter le token ici, Supabase le gère automatiquement après invite
    })

    setLoading(false)

    if (error) {
      alert("Erreur : " + error.message)
    } else {
      alert("Mot de passe défini ! Vous pouvez maintenant vous connecter.")
      router.push("/auth") // redirige vers login
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleSetPassword} className="bg-gray-800 p-6 rounded shadow-md">
        <h2 className="text-xl mb-4">Définir votre mot de passe</h2>
        <input
          type="password"
          placeholder="Nouveau mot de passe"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="p-2 mb-4 w-full rounded text-black"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-yellow-500 p-2 rounded w-full text-black font-bold"
        >
          {loading ? "Chargement..." : "Définir le mot de passe"}
        </button>
      </form>
    </div>
  )
}
