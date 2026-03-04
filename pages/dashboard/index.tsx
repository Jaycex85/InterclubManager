'use client'

import { useEffect, useState, useRef } from "react"
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

type Roles = { admin: boolean; player: boolean; captain: boolean; club_admin: boolean }
type Membership = { club_id: number; club_name: string; role: "player" | "captain" | "club_admin" }

export default function DashboardIndex() {
  const router = useRouter()
  const [roles, setRoles] = useState<Roles>({ admin: false, player: false, captain: false, club_admin: false })
  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState<keyof Roles | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])

  // ----- hook slide-down pour dashboard
  const useSlideDown = (isOpen: boolean) => {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState('0px')

    useEffect(() => {
      if (ref.current) {
        // timeout pour laisser le DOM se stabiliser
        setTimeout(() => setHeight(isOpen ? `${ref.current!.scrollHeight}px` : '0px'), 0)
      }
    }, [isOpen, ref.current?.scrollHeight])

    return { ref, style: { maxHeight: height, overflow: 'hidden', transition: 'max-height 0.35s ease' } }
  }

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return router.replace("/auth")

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", session.user.id)
        .single()
      if (userError || !userData) return router.replace("/auth")

      const userRoles: Roles = {
        admin: userData.role === "admin",
        player: userData.role === "player",
        captain: userData.role === "captain",
        club_admin: userData.role === "club_admin"
      }

      setRoles(userRoles)

      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select(`club_id, role, clubs(name)`)
        .eq("user_id", userData.id)

      if (!membershipsError && membershipsData) {
        setMemberships(membershipsData.map((m: any) => ({
          club_id: m.club_id,
          club_name: m.clubs.name,
          role: m.role
        })))
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
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-4">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard</h1>

      {panels.map(panel => roles[panel.key] && (() => {
        const { ref, style } = useSlideDown(openPanel === panel.key)
        return (
          <div key={panel.key} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenPanel(openPanel === panel.key ? null : panel.key)}
            >
              {panel.label}
            </button>
            <div ref={ref} style={style}>
              {openPanel === panel.key && panel.component}
            </div>
          </div>
        )
      })())}
    </div>
  )
}
