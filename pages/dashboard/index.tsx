'use client'

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Dashboards dynamiques
const AdminDashboard = dynamic(() => import("./admin/AdminDashboard"), { ssr: false })
const CaptainDashboard = dynamic(() => import("./capitaine/DashboardCapitaine"), { ssr: false })

// Tiles placeholders
const PlayerDashboardTile = ({ clubName, role }: { clubName: string, role: string }) => (
  <div className="bg-gray-800 p-4 rounded shadow">
    <h2 className="font-bold text-lg">{clubName}</h2>
    <p>Rôle : {role}</p>
  </div>
)
const ClubAdminDashboardTile = ({ clubName, role }: { clubName: string, role: string }) => (
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
  const [roles, setRoles] = useState<Roles>({
    admin: false,
    player: false,
    captain: false,
    club_admin: false
  })
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = "/auth"
        return
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", session.user.id)
        .single()

      if (userError || !userData) {
        window.location.href = "/auth"
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

      // Récupérer les memberships pour clubs
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
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Vérification de votre session...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        Dashboard
      </h1>

      <div className="space-y-4">

        {/* ---------- ADMIN PANEL ---------- */}
        {roles.admin && (
          <div className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenPanel(openPanel === "admin" ? null : "admin")}
            >
              Admin
            </button>
            <div className={`transition-all duration-500 overflow-hidden ${openPanel === "admin" ? "max-h-[5000px]" : "max-h-0"}`}>
              {openPanel === "admin" && <AdminDashboard />}
            </div>
          </div>
        )}

        {/* ---------- CAPTAIN PANEL ---------- */}
        {roles.captain && memberships.filter(m => m.role === "captain").map(m => (
          <div key={`captain-${m.club_id}`} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenPanel(openPanel === `captain-${m.club_id}` ? null : `captain-${m.club_id}`)}
            >
              Capitaine - {m.club_name}
            </button>
            <div className={`transition-all duration-500 overflow-hidden ${openPanel === `captain-${m.club_id}` ? "max-h-[5000px]" : "max-h-0"}`}>
              {openPanel === `captain-${m.club_id}` && (
                <div className="p-4">
                  <CaptainDashboard />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ---------- PLAYER PANELS ---------- */}
        {roles.player && memberships.filter(m => m.role === "player").map(m => (
          <div key={`player-${m.club_id}`} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenPanel(openPanel === `player-${m.club_id}` ? null : `player-${m.club_id}`)}
            >
              Joueur - {m.club_name}
            </button>
            <div className={`transition-all duration-500 overflow-hidden ${openPanel === `player-${m.club_id}` ? "max-h-[5000px]" : "max-h-0"}`}>
              {openPanel === `player-${m.club_id}` && (
                <div className="p-4">
                  <PlayerDashboardTile clubName={m.club_name} role={m.role} />
                </div>
              )}
            </div>
          </div>
        ))}

        {/* ---------- CLUB ADMIN PANELS ---------- */}
        {roles.club_admin && memberships.filter(m => m.role === "club_admin").map(m => (
          <div key={`clubadmin-${m.club_id}`} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenPanel(openPanel === `clubadmin-${m.club_id}` ? null : `clubadmin-${m.club_id}`)}
            >
              Club Admin - {m.club_name}
            </button>
            <div className={`transition-all duration-500 overflow-hidden ${openPanel === `clubadmin-${m.club_id}` ? "max-h-[5000px]" : "max-h-0"}`}>
              {openPanel === `clubadmin-${m.club_id}` && (
                <div className="p-4">
                  <ClubAdminDashboardTile clubName={m.club_name} role={m.role} />
                </div>
              )}
            </div>
          </div>
        ))}

      </div>
    </div>
  )
}
