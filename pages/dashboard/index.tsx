// pages/dashboard/index.tsx
'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = {
  admin: boolean
  club_admin: boolean
  player: boolean
  captain: boolean
}

export default function DashboardPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [roles, setRoles] = useState<Roles>({
    admin: false,
    club_admin: false,
    player: false,
    captain: false,
  })

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession()

      if (sessionError) {
        console.log("Erreur récupération session :", sessionError)
        router.replace("/auth")
        return
      }

      if (!session?.user) {
        console.log("Pas de session user")
        router.replace("/auth")
        return
      }

      // Récupère le profil dans la table users
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single()

      if (profileError || !userProfile) {
        console.log("Erreur profil ou profil introuvable :", profileError)
        router.replace("/auth")
        return
      }

      // Détermine les rôles
      const newRoles: Roles = {
        admin: userProfile.role === "admin",
        club_admin: userProfile.role === "club_admin",
        player: userProfile.role === "player",
        captain: userProfile.is_captain || false, // si tu as un champ is_captain
      }

      setRoles(newRoles)
      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Vérification de votre session...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {roles.admin && (
          <a
            href="/dashboard/admin"
            className="bg-yellow-500 hover:bg-yellow-600 p-6 rounded shadow text-black font-bold text-xl text-center"
          >
            Admin
          </a>
        )}

        {roles.club_admin && (
          <a
            href="/dashboard/club_admin"
            className="bg-green-500 hover:bg-green-600 p-6 rounded shadow text-black font-bold text-xl text-center"
          >
            Responsable Club
          </a>
        )}

        {roles.player && (
          <a
            href="/dashboard/player"
            className="bg-blue-500 hover:bg-blue-600 p-6 rounded shadow text-black font-bold text-xl text-center"
          >
            Joueur
          </a>
        )}

        {roles.captain && (
          <a
            href="/dashboard/captain"
            className="bg-purple-500 hover:bg-purple-600 p-6 rounded shadow text-black font-bold text-xl text-center"
          >
            Capitaine
          </a>
        )}
      </div>
    </div>
  )
}
