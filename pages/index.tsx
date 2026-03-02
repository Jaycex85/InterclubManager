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
    const checkSession = async () => {
      const { data, error } = await supabase.auth.getSession()
      const session = data.session

      if (error) {
        console.error("Erreur lors de la récupération de la session :", error.message)
        router.replace("/auth")
        return
      }

      if (!session) {
        // Pas de session => login
        router.replace("/auth")
        return
      }

      // Session existante, récupère le rôle depuis votre table "users"
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", session.user.id)
        .single()

      if (userError || !userData) {
        console.error("Impossible de récupérer le rôle de l'utilisateur :", userError?.message)
        router.replace("/auth")
        return
      }

      // Redirection selon le rôle
      switch (userData.role) {
        case "admin":
          router.replace("/dashboard/admin/clubs")
          break
        case "club_admin":
          router.replace("/dashboard/responsable/equipes")
          break
        case "player":
          router.replace("/dashboard/player") // à créer si besoin
          break
        default:
          router.replace("/auth")
      }
    }

    checkSession()
  }, [router])

  return <p className="text-center mt-10">Vérification de la session...</p>
}
