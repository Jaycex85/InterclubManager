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
      const { error } = await supabase.auth.getSession()

      if (!error) {
        router.push("/dashboard") // ou "/" si tu préfères
      } else {
        router.push("/auth")
      }
    }

    handleAuth()
  }, [router])

  return <p>Connexion en cours...</p>
}
