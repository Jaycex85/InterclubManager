// pages/auth/callback.tsx
import { useEffect } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const hash = window.location.hash
      const params = new URLSearchParams(hash.replace("#", "?"))
      const access_token = params.get("access_token")
      const type = params.get("type")
      const token = params.get("token") // token d’invitation

      if (type === "invite" && token) {
        // Redirige automatiquement vers set-password avec le token
        router.replace(`/auth/set-password?token=${token}`)
        return
      }

      // Pour les logins classiques avec access_token
      if (access_token) {
        await supabase.auth.setSession({ access_token })
        router.replace("/dashboard")
        return
      }

      // Si échec ou URL invalide
      router.replace("/auth")
    }

    handleAuth()
  }, [router])

  return <p className="text-center mt-10 text-white">Connexion en cours...</p>
}
