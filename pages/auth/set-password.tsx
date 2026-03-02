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
  const { token } = router.query // token d'invitation
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [errorMsg, setErrorMsg] = useState("")

  useEffect(() => {
    if (!token) return
    // Optionnel : vérifier si token est bien présent
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!token || !password) return

    setLoading(true)
    setErrorMsg("")

    // Ici on confirme l'invitation et définit le mot de passe
    const { error } = await supabase.auth.updateUser({
      password
    }, {
      emailChangeToken: token as string // important pour l'invitation
    })

    setLoading(false)

    if (error) {
      setErrorMsg(error.message)
    } else {
      // redirige vers login après succès
      router.push("/auth")
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <form onSubmit={handleSubmit} className="bg-gray-800 p-6 rounded-lg shadow-lg space-y-4 w-full max-w-sm">
        <h2 className="text-2xl font-bold">Définir votre mot de passe</h2>

        {errorMsg && <p className="text-red-500">{errorMsg}</p>}

        <input
          type="password"
          placeholder="Nouveau mot de passe"
          className="w-full p-2 rounded bg-gray-700 text-white"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          type="submit"
          className="w-full bg-yellow-500 hover:bg-yellow-600 text-black font-bold py-2 rounded"
          disabled={loading}
        >
          {loading ? "En cours..." : "Valider le mot de passe"}
        </button>
      </form>
    </div>
  )
}
