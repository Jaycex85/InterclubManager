'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = {
  admin: boolean
  club_admin: boolean
}

type ClubMembership = {
  club_id: string
  club_name: string
  role: "club_admin" | "player"
}

type Team = {
  id: string
  name: string
  category: string
  gender: string
  captain_id?: string
}

type User = {
  id: string
  first_name: string
  last_name: string
  email: string
}

export default function DashboardClubAdmin({ roles, clubMemberships }: { roles: Roles, clubMemberships: ClubMembership[] }) {
  const [clubs, setClubs] = useState<any[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedClub, setSelectedClub] = useState<string | null>(null)

  // ---------------- LOAD DATA ----------------
  useEffect(() => {
    const loadData = async () => {
      // 1️⃣ Clubs
      let clubQuery = supabase.from("clubs").select("*")
      if (!roles.admin) {
        const clubIds = clubMemberships.map(c => c.club_id)
        clubQuery = clubQuery.in("id", clubIds)
      }
      const { data: clubsData } = await clubQuery
      setClubs(clubsData || [])

      // 2️⃣ Teams
      let teamQuery = supabase.from("teams").select("*")
      if (!roles.admin) {
        const clubIds = clubMemberships.map(c => c.club_id)
        teamQuery = teamQuery.in("club_id", clubIds)
      }
      const { data: teamsData } = await teamQuery
      setTeams(teamsData || [])

      // 3️⃣ Users (players)
      let usersQuery = supabase.from("users").select("id, auth_id")
      if (!roles.admin) {
        const clubIds = clubMemberships.map(c => c.club_id)
        // get users in clubs
        const { data: clubUsers } = await supabase
          .from("club_memberships")
          .select("user_id")
          .in("club_id", clubIds)
        usersQuery = usersQuery.in("id", (clubUsers || []).map(u => u.user_id))
      }
      const { data: usersData } = await usersQuery
      // Get first_name/last_name from auth
      const { data: profiles } = await supabase.auth.admin.getUsers()
      const mapped: User[] = (usersData || []).map(u => {
        const profile = profiles.users.find((p: any) => p.id === u.auth_id)
        return {
          id: u.id,
          first_name: profile?.user_metadata?.first_name || "",
          last_name: profile?.user_metadata?.last_name || "",
          email: profile?.email || ""
        }
      })
      setUsers(mapped)
    }
    loadData()
  }, [roles, clubMemberships])

  // ---------------- HELPERS ----------------
  const addTeam = async (club_id: string) => {
    const { data, error } = await supabase.from("teams").insert({ club_id, name: "Nouvelle équipe", category: "P50", gender: "Homme" })
    if (!error) setTeams(prev => [...prev, data[0]])
  }

  const updateTeam = async (team: Team) => {
    const { error } = await supabase.from("teams").update(team).eq("id", team.id)
    if (!error) setTeams(prev => prev.map(t => t.id === team.id ? team : t))
  }

  const assignCaptain = async (team_id: string, user_id: string) => {
    const { error } = await supabase.from("team_memberships").upsert({ team_id, user_id, role: "captain" })
    if (!error) {
      setTeams(prev => prev.map(t => t.id === team_id ? { ...t, captain_id: user_id } : t))
    }
  }

  return (
    <div className="p-4 bg-gray-800 rounded space-y-6">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">Dashboard Club Admin</h2>

      <div className="space-y-4">
        {clubs.map(c => (
          <div key={c.id} className="border border-gray-700 rounded p-4 bg-gray-900">
            <div className="flex justify-between items-center mb-2">
              <h3 className="font-bold">{c.name}</h3>
              {(roles.admin || clubMemberships.some(cm => cm.club_id === c.id && cm.role === "club_admin")) && (
                <button className="bg-yellow-500 px-2 py-1 rounded" onClick={() => addTeam(c.id)}>+ Ajouter équipe</button>
              )}
            </div>

            <div className="ml-4 space-y-2">
              {teams.filter(t => t.club_id === c.id).map(t => (
                <div key={t.id} className="border border-gray-600 rounded p-2 bg-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <input
                        type="text"
                        className="bg-gray-700 p-1 rounded w-48"
                        value={t.name}
                        onChange={e => updateTeam({ ...t, name: e.target.value })}
                      />
                      <span className="ml-2 text-sm text-gray-300">{t.category} ({t.gender})</span>
                    </div>
                    <div>
                      <select
                        value={t.captain_id || ""}
                        onChange={e => assignCaptain(t.id, e.target.value)}
                        className="bg-gray-700 text-sm p-1 rounded"
                      >
                        <option value="">Capitaine</option>
                        {users.map(u => (
                          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-2 text-sm text-gray-400">
              {teams.filter(t => t.club_id === c.id).length} équipe(s) - {users.length} joueur(s)
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
