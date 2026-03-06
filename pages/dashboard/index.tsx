'use client'

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const AdminDashboard = dynamic(() => import("./admin/AdminDashboard"), { ssr: false })
const CaptainDashboard = dynamic(() => import("./capitaine/DashboardCapitaine"), { ssr: false })

// ---------------- PLAYER DASHBOARD COMPONENT ----------------
const PlayerTeamDashboard = ({ teamId }: { teamId: string }) => {
  const [matches, setMatches] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMatches = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) return
      const userId = session.user.id

      // fetch matches + availability pour ce joueur
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          availability!inner(status, selection_status, user_id)
        `)
        .eq('team_id', teamId)
        .eq('availability.user_id', userId)
        .order('match_date', { ascending: true })

      if (error) console.error(error)
      if (data) setMatches(data)
      setLoading(false)
    }
    fetchMatches()
  }, [teamId])

  if (loading) return <div>Chargement des matchs...</div>
  if (!matches.length) return <div>Aucun match pour cette équipe.</div>

  return (
    <div className="space-y-2">
      {matches.map(m => {
        const avail = m.availability[0] // un seul record par joueur
        return (
          <div key={m.id} className={`p-2 rounded ${avail?.status === 'available' ? 'bg-gray-700' : 'bg-gray-800 opacity-70'}`}>
            <div>
              {m.match_date} {m.match_time} - {m.opponent} ({m.location_type})
              {m.clubaddress && (
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubaddress)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="ml-2 text-blue-400 underline"
                >
                  📍
                </a>
              )}
            </div>
            <div>
              Votre statut : <span className="font-bold">{avail?.status}</span> | Sélection : <span className="font-bold">{avail?.selection_status}</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ---------------- INDEX DASHBOARD ----------------
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

      // 1️⃣ Club memberships
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

      // 2️⃣ Team memberships
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

      // 3️⃣ Global roles — captains peuvent aussi voir dashboard joueur
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

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Vérification de votre session...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard</h1>

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

        {/* ---------- PLAYER PANELS ---------- */}
        {roles.player && teamMemberships
          .filter(t => t.role === "player" || t.role === "captain") // captains inclus pour voir dashboard joueur
          .map(t => {
            const panelKey = `player-${t.team_id}`
            return (
              <div key={panelKey} className="border border-gray-700 rounded overflow-hidden">
                <button
                  className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
                  onClick={() => setOpenPanel(openPanel === panelKey ? null : panelKey)}
                >
                  Joueur - {t.team_name}
                </button>
                <div className={`transition-all duration-500 overflow-hidden ${openPanel === panelKey ? "max-h-[5000px]" : "max-h-0"}`}>
                  {openPanel === panelKey && (
                    <div className="p-4">
                      <PlayerTeamDashboard teamId={t.team_id} />
                    </div>
                  )}
                </div>
              </div>
            )
          })}

        {/* ---------- CAPTAIN PANELS ---------- */}
        {roles.captain && teamMemberships
          .filter(t => t.role === "captain")
          .map(t => (
            <div key={`captain-${t.team_id}`} className="border border-gray-700 rounded overflow-hidden">
              <button
                className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
                onClick={() => setOpenPanel(openPanel === `captain-${t.team_id}` ? null : `captain-${t.team_id}`)}
              >
                Capitaine - {t.team_name}
              </button>
              <div className={`transition-all duration-500 overflow-hidden ${openPanel === `captain-${t.team_id}` ? "max-h-[5000px]" : "max-h-0"}`}>
                {openPanel === `captain-${t.team_id}` && (
                  <div className="p-4">
                    <CaptainDashboard />
                  </div>
                )}
              </div>
            </div>
          ))}

      </div>
    </div>
  )
}
