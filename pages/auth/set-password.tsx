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
  const { token } = router.query
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSetPassword = async () => {
    if (!token || typeof token !== "string") return
    setLoading(true)

    // Supabase v2 : utiliser updateUser avec email_change_token
    const { error } = await supabase.auth.updateUser({
      password,
      email_change_token: token // c’est la clé pour les invitations
    } as any) // `as any` car TypeScript n’a pas encore typé email_change_token

    setLoading(false)
    if (error) {
      console.error(error)
      alert("Erreur lors de la création du mot de passe")
    } else {
      router.replace("/auth") // après avoir défini le mot de passe, redirection vers login
    }
  }

  return (
    <div>
      <h1>Définir votre mot de passe</h1>
      <input
        type="password"
        placeholder="Nouveau mot de passe"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />
      <button onClick={handleSetPassword} disabled={loading}>
        {loading ? "Chargement..." : "Valider"}
      </button>
    </div>
  )
}
