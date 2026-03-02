// pages/auth/callback.tsx
import { useEffect } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Callback() {
  const router = useRouter()
  const { access_token, refresh_token } = router.query

  useEffect(() => {
    const handleAuth = async () => {
      // Vérifie que les tokens existent
      if (typeof access_token === "string" && typeof refresh_token === "string") {
        // Passe les deux tokens à Supabase
        const { error } = await supabase.auth.setSession({
          access_token,
          refresh_token,
        })

        if (!error) {
          router.replace("/dashboard") // Redirection après login
        } else {
          console.error(error)
          router.replace("/auth")
        }
      } else {
        // Pas de tokens, renvoie à la page login
        router.replace("/auth")
      }
    }

    handleAuth()
  }, [access_token, refresh_token, router])

  return <p>Connexion en cours...</p>
}
