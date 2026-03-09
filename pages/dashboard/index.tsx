'use client'

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// ---------------- DASHBOARDS ----------------

const AdminDashboard = dynamic(() => import("./admin/AdminDashboard"), { ssr: false })
const DashboardClubAdmin = dynamic(() => import("./club_admin/DashboardClubAdmin"), { ssr: false })
const CaptainDashboard = dynamic(() => import("./capitaine/DashboardCapitaine"), { ssr: false })
const DashboardJoueur = dynamic(() => import("./joueur/DashboardJoueur"), { ssr: false })

// ---------------- TYPES ----------------

type Roles = {
  admin: boolean
  player: boolean
  captain: boolean
  club_admin: boolean
}

type ClubMembership = {
  club_id: string
  club_name: string
  role: "player" | "club_admin"
}

type TeamMembership = {
  team_id: string
  team_name: string
  role: "player" | "captain"
}

export default function DashboardIndex() {

  const [roles, setRoles] = useState<Roles>({
    admin: false,
    player: false,
    captain: false,
    club_admin: false
  })

  const [loading, setLoading] = useState(true)
  const [openPanel, setOpenPanel] = useState<string | null>(null)

  const [clubMemberships, setClubMemberships] = useState<ClubMembership[]>([])
  const [teamMemberships, setTeamMemberships] = useState<TeamMembership[]>([])

  useEffect(() => {

    const checkUser = async () => {

      const { data: { session } } = await supabase.auth.getSession()

      if (!session?.user) {
        window.location.href = "/auth"
        return
      }

      const { data: userData } = await supabase
        .from("users")
        .select("id, role")
        .eq("auth_id", session.user.id)
        .single()

      if (!userData) {
        window.location.href = "/auth"
        return
      }

      const userId = userData.id

      // CLUBS

      const { data: clubsData } = await supabase
        .from("club_memberships")
        .select("club_id, role, clubs(name)")
        .eq("user_id", userId)

      const clubs: ClubMembership[] = (clubsData || []).map((m: any) => ({
        club_id: m.club_id,
        club_name: m.clubs.name,
        role: m.role
      }))

      setClubMemberships(clubs)

      // TEAMS

      const { data: teamsData } = await supabase
        .from("team_memberships")
        .select("team_id, role, teams(name)")
        .eq("user_id", userId)

      const teams: TeamMembership[] = (teamsData || []).map((m: any) => ({
        team_id: m.team_id,
        team_name: m.teams.name,
        role: m.role
      }))

      setTeamMemberships(teams)

      // ROLES

      setRoles({
        admin: userData.role === "admin",
        player: teams.some(t => t.role === "player" || t.role === "captain"),
        captain: teams.some(t => t.role === "captain"),
        club_admin: clubs.some(c => c.role === "club_admin")
      })

      setLoading(false)

    }

    checkUser()

  }, [])

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        Vérification session...
      </div>
    )

  return (

    <div className="min-h-screen bg-gray-900 text-white p-6">

      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        Dashboard
      </h1>

      <div className="space-y-4">

        {/* ADMIN */}

        {roles.admin && (
          <Panel
            title="Admin"
            panelKey="admin"
            openPanel={openPanel}
            setOpenPanel={setOpenPanel}
          >
            <AdminDashboard />
          </Panel>
        )}

        {/* CLUB ADMIN */}

        {(roles.admin || roles.club_admin) && (
          <Panel
            title="Gestion Club"
            panelKey="club_admin"
            openPanel={openPanel}
            setOpenPanel={setOpenPanel}
          >
            <DashboardClubAdmin />
          </Panel>
        )}

        {/* CAPTAIN */}

        {roles.captain &&
          teamMemberships
            .filter(t => t.role === "captain")
            .map(t => (
              <Panel
                key={t.team_id}
                title={`Capitaine - ${t.team_name}`}
                panelKey={`captain-${t.team_id}`}
                openPanel={openPanel}
                setOpenPanel={setOpenPanel}
              >
                <CaptainDashboard />
              </Panel>
            ))}

        {/* PLAYER */}

        {roles.player &&
          teamMemberships
            .filter(t => t.role === "player" || t.role === "captain")
            .map(t => (
              <Panel
                key={t.team_id}
                title={`Joueur - ${t.team_name}`}
                panelKey={`player-${t.team_id}`}
                openPanel={openPanel}
                setOpenPanel={setOpenPanel}
              >
                <DashboardJoueur />
              </Panel>
            ))}

      </div>

    </div>
  )
}

// PANEL COMPONENT

function Panel({ title, panelKey, openPanel, setOpenPanel, children }: any) {

  return (

    <div className="border border-gray-700 rounded overflow-hidden">

      <button
        className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
        onClick={() =>
          setOpenPanel(openPanel === panelKey ? null : panelKey)
        }
      >
        {title}
      </button>

      <div
        className={`transition-all duration-500 overflow-hidden ${
          openPanel === panelKey ? "max-h-[5000px]" : "max-h-0"
        }`}
      >
        {openPanel === panelKey && (
          <div className="p-4">
            {children}
          </div>
        )}
      </div>

    </div>
  )
}
