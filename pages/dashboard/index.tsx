'use client'

import { useEffect, useState, useLayoutEffect, useRef } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AdminDashboard = dynamic(() => import("./admin/AdminDashboard"), { ssr: false })

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

type ExpandableItemProps = {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ExpandableItem({ title, isOpen, onToggle, children }: ExpandableItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState('0px')

  useLayoutEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const id = requestAnimationFrame(() => {
      setHeight(isOpen ? `${el.scrollHeight}px` : '0px')
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, children])

  return (
    <div className="mb-4 border-b border-gray-700 rounded overflow-hidden">
      <button
        className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
        onClick={onToggle}
      >
        {title}
      </button>
      <div
        ref={ref}
        style={{ maxHeight: height, overflow: 'hidden', transition: 'max-height 0.35s ease' }}
        className="p-2 bg-gray-700 mt-2 rounded"
      >
        {children}
      </div>
    </div>
  )
}

export default function DashboardIndex() {
  const [roles, setRoles] = useState<Roles>({ admin: false, player: false, captain: false, club_admin: false })
  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState<keyof Roles | null>(null)
  const [memberships, setMemberships] = useState<Membership[]>([])

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return setLoading(false)

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", session.user.id)
        .single()

      if (userError || !userData) return setLoading(false)

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
  }, [])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Vérification de votre session...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard</h1>

      <div className="space-y-4">
        {roles.admin && (
          <ExpandableItem
            title="Admin"
            isOpen={openPanel === 'admin'}
            onToggle={() => setOpenPanel(openPanel === 'admin' ? null : 'admin')}
          >
            <AdminDashboard />
          </ExpandableItem>
        )}

        {roles.player && memberships.filter(m => m.role === "player").map(m => (
          <ExpandableItem
            key={`player-${m.club_id}`}
            title={`Joueur - ${m.club_name}`}
            isOpen={openPanel === `player-${m.club_id}`}
            onToggle={() => setOpenPanel(openPanel === `player-${m.club_id}` ? null : `player-${m.club_id}`)}
          >
            <div className="p-2">
              {/* Ici tu pourras mettre le composant PlayerForm ou autre */}
              <p>Contenu du dashboard joueur pour {m.club_name}</p>
            </div>
          </ExpandableItem>
        ))}

        {roles.captain && memberships.filter(m => m.role === "captain").map(m => (
          <ExpandableItem
            key={`captain-${m.club_id}`}
            title={`Capitaine - ${m.club_name}`}
            isOpen={openPanel === `captain-${m.club_id}`}
            onToggle={() => setOpenPanel(openPanel === `captain-${m.club_id}` ? null : `captain-${m.club_id}`)}
          >
            <div className="p-2">
              {/* Ici tu pourras mettre le composant CaptainForm ou autre */}
              <p>Contenu du dashboard capitaine pour {m.club_name}</p>
            </div>
          </ExpandableItem>
        ))}
      </div>
    </div>
  )
}
