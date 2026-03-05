'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import dynamic from "next/dynamic"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AdminDashboard = dynamic(() => import("./admin/AdminDashboard"), { ssr: false })

const PlayerDashboardTile = ({ clubName, role }: { clubName: string, role: string }) => (
  <div className="bg-gray-800 p-4 rounded shadow">
    <h2 className="font-bold text-lg">{clubName}</h2>
    <p>Rôle : {role}</p>
  </div>
)

const CaptainDashboardTile = ({ clubName, role }: { clubName: string, role: string }) => (
  <div className="bg-gray-800 p-4 rounded shadow">
    <h2 className="font-bold text-lg">{clubName}</h2>
    <p>Rôle : {role}</p>
  </div>
)

type Roles = {
  admin: boolean
  player: boolean
  captain: boolean
  club_admin: boolean
}

type Membership = {
  club_id: number
  club_name: string
  role: "player" | "captain" | "club_admin"
}

export default function DashboardIndex() {
  const router = useRouter()
  const [roles, setRoles] = useState<Roles>({ admin: false, player: false, captain: false, club_admin: false })
  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState<keyof Roles | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        router.replace("/auth")
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", session.user.id)
        .single()
      if (userError || !userData) {
        router.replace("/auth")
        return
      }

      const userId = userData.id
      const globalRole = userData.role

      setRoles({
        admin: globalRole === "admin",
        player: globalRole === "player",
        captain: globalRole === "captain",
        club_admin: globalRole === "club_admin",
      })

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select(`club_id, role, clubs(name)`)
        .eq("user_id", userId)

      if (!membershipsError && membershipsData) {
        const formatted: Membership[] = membershipsData.map((m: any) => ({
          club_id: m.club_id,
          club_name: m.clubs.name,
          role: m.role
        }))
        setMemberships(formatted)
      }

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
    { key: "player", label: "Joueur", component: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {memberships.filter(m => m.role === "player").map(m => (
          <PlayerDashboardTile key={m.club_id} clubName={m.club_name} role={m.role} />
        ))}
      </div>
    ) },
    { key: "captain", label: "Capitaine", component: (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
        {memberships.filter(m => m.role === "captain").map(m => (
          <CaptainDashboardTile key={m.club_id} clubName={m.club_name} role={m.role} />
        ))}
      </div>
    ) },
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
            <div className={`transition-all duration-500 overflow-hidden ${openPanel === panel.key ? 'max-h-[5000px]' : 'max-h-0'}`}>
              {openPanel === panel.key && panel.component}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
