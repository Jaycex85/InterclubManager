// pages/index.tsx
import React, { useEffect, useState } from "react"
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
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        // Pas de session -> login
        router.replace("/auth")
        return
      }

      const { data: userData, error } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", session.user.id)
        .single()

      if (error || !userData) {
        router.replace("/auth")
        return
      }

      // Redirection selon rôle
      switch (userData.role) {
        case "admin":
          router.replace("/dashboard/admin/clubs")
          break
        case "club_admin":
          router.replace("/dashboard/club_admin/equipes")
          break
        case "player":
          router.replace("/dashboard/player")
          break
        default:
          router.replace("/auth")
      }
    }

    checkUser()
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      <p>Chargement...</p>
    </div>
  )
}
