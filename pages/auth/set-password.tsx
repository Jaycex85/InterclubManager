// pages/auth/set-password.tsx
import { useState, useEffect } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function SetPassword() {
  const router = useRouter()
  const { token } = router.query // token envoyé par Supabase dans le lien d'invitation

  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    if (!token) return
    // On pourrait vérifier le token ici si besoin
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || typeof token !== "string") {
      setError("Token invalide")
      return
    }

    setLoading(true)
    setError(null)

    const { error: updateError } = await supabase.auth.updateUser({
      password
    }, token) // ici le token d'invitation/email

    setLoading(false)

    if (updateError) {
      setError(updateError.message)
      return
    }

    setSuccess(true)
    // Redirige vers login
    router.push("/auth")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <div className="bg-gray-800 p-8 rounded-md shadow-md w-full max-w-md">
        <h1 className="text-2xl mb-4">Définir votre mot de passe</h1>
        {error && <p className="text-red-400 mb-4">{error}</p>}
        {success && <p className="text-green-400 mb-4">Mot de passe défini avec succès ! Redirection...</p>}
        {!success && (
          <form onSubmit={handleSubmit}>
            <input
              type="password"
              placeholder="Nouveau mot de passe"
              className="w-full p-2 mb-4 rounded text-black"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
            <button
              type="submit"
              className="w-full bg-yellow-500 text-black p-2 rounded hover:bg-yellow-600"
              disabled={loading}
            >
              {loading ? "Chargement..." : "Définir le mot de passe"}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
