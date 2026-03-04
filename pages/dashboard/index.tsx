'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import dynamic from "next/dynamic"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Chargement dynamique des dashboards
const AdminDashboard = dynamic(() => import("./admin/AdminDashboard"), { ssr: false })
const PlayerDashboard = () => (
  <div className="p-4 text-gray-300">Dashboard joueur à venir...</div>
)
const CaptainDashboard = () => (
  <div className="p-4 text-gray-300">Dashboard capitaine à venir...</div>
)

type Roles = {
  admin: boolean
  player: boolean
  captain: boolean
}

export default function DashboardIndex() {
  const router = useRouter()
  const [roles, setRoles] = useState<Roles>({ admin: false, player: false, captain: false })
  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState<keyof Roles | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      if (!session?.user) {
        router.replace("/auth")
        return
      }

      // Récupération du rôle depuis Supabase
      const { data: profile, error } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", session.user.id)
        .single()

      if (error || !profile) {
        router.replace("/auth")
        return
      }

      const userRoles: Roles = {
        admin: profile.role === "admin",
        player: profile.role === "player",
        captain: profile.role === "captain" || false,
      }

      if (!userRoles.admin && !userRoles.player && !userRoles.captain) {
        router.replace("/auth")
        return
      }

      setRoles(userRoles)
      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Vérification de votre session...
    </div>
  )

  const panels: { key: keyof Roles; label: string; component: JSX.Element }[] = [
    { key: "admin", label: "Admin", component: <AdminDashboard /> },
    { key: "player", label: "Joueur", component: <PlayerDashboard /> },
    { key: "captain", label: "Capitaine", component: <CaptainDashboard /> },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard</h1>

      <div className="space-y-4">
        {panels.map(panel => roles[panel.key] && (
          <div key={panel.key} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenPanel(openPanel === panel.key ? null : panel.key)}
            >
              {panel.label}
            </button>
            <div className={`transition-max-h duration-500 overflow-hidden ${openPanel === panel.key ? 'max-h-[2000px]' : 'max-h-0'}`}>
              {openPanel === panel.key && panel.component}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
