// pages/index.tsx
import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function Home() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      // Récupère la session active
      const { data: { session }, error } = await supabase.auth.getSession()

      if (error || !session) {
        // Pas de session → login
        router.replace("/auth")
        return
      }

      // Récupère l'utilisateur dans la table users
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", session.user.id)
        .single()

      if (userError || !userData) {
        router.replace("/auth")
        return
      }

      // Redirige selon le rôle
      if (userData.role === "admin") {
        router.replace("/dashboard/admin/clubs")
      } else if (userData.role === "club_admin") {
        router.replace("/dashboard/responsable/equipes")
      } else if (userData.role === "player") {
        router.replace("/dashboard/player")
      } else {
        router.replace("/auth") // rôle inconnu
      }
    }

    checkUser()
  }, [router])

  return <p>Chargement...</p>
}
