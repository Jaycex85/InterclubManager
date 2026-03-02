import { useEffect } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Callback() {
  const router = useRouter()

  useEffect(() => {
    const handleAuth = async () => {
      const token = router.query.token as string
      const type = router.query.type as string

      if (type === "invite" && token) {
        // Lien d’invitation → redirige vers set-password
        router.push(`/auth/set-password?token=${token}`)
      } else {
        // Session normale
        const { error } = await supabase.auth.getSession()
        if (!error) {
          router.push("/dashboard")
        } else {
          router.push("/auth")
        }
      }
    }

    handleAuth()
  }, [router])

  return <p>Connexion en cours...</p>
}
