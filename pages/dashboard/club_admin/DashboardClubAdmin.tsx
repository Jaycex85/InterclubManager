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
  role: "player" | "club_admin"
}

type Team = {
  id: string
  name: string
  gender: string
  category: string
  club_id: string
}

type ClubUser = {
  user_id: string
  first_name: string
  last_name: string
  email: string
  role: "player" | "club_admin" | "captain"
}

type Props = {
  roles: Roles
  clubMemberships: ClubMembership[]
}

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [clubUsers, setClubUsers] = useState<ClubUser[]>([])
  const [loading, setLoading] = useState(true)
  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamGender, setNewTeamGender] = useState("Homme")
  const [newTeamCategory, setNewTeamCategory] = useState("P50")

  useEffect(() => {
    const fetchData = async () => {
      const clubIds = roles.admin
        ? undefined // admin voit tous les clubs
        : clubMemberships.map(c => c.club_id)

      // 1️⃣ Récupérer les équipes
      const teamQuery = supabase
        .from("teams")
        .select("id, name, gender, category, club_id")
      if (!roles.admin) teamQuery.in("club_id", clubIds)

      const { data: teamsData, error: teamsError } = await teamQuery
      if (teamsError) console.error("Teams fetch error:", teamsError)
      setTeams(teamsData || [])

      // 2️⃣ Récupérer les utilisateurs liés aux clubs
      const usersQuery = supabase
        .from("club_memberships")
        .select("user_id, role, users(first_name, last_name, email)")
      if (!roles.admin) usersQuery.in("club_id", clubIds)

      const { data: usersData, error: usersError } = await usersQuery
      if (usersError) console.error("Users fetch error:", usersError)

      // dédupliquer les utilisateurs
      const usersMap: Record<string, ClubUser> = {}
      (usersData || []).forEach((m: any) => {
        if (m.users && !usersMap[m.user_id]) {
          usersMap[m.user_id] = {
            user_id: m.user_id,
            first_name: m.users.first_name,
            last_name: m.users.last_name,
            email: m.users.email,
            role: m.role
          }
        }
      })
      setClubUsers(Object.values(usersMap))
      setLoading(false)
    }

    fetchData()
  }, [roles, clubMemberships])

  const addTeam = async () => {
    const club_id =
      roles.admin && clubMemberships.length === 1
        ? clubMemberships[0].club_id
        : clubMemberships[0]?.club_id

    if (!newTeamName || !club_id) return alert("Nom de l'équipe requis")

    const { error } = await supabase
      .from("teams")
      .insert([{ name: newTeamName, gender: newTeamGender, category: newTeamCategory, club_id }])
    if (error) return console.error("Add team error:", error)
    setNewTeamName("")
    setNewTeamGender("Homme")
    setNewTeamCategory("P50")
    setLoading(true)
    setTimeout(() => setLoading(false), 500) // relance fetch
  }

  const categories = {
    Homme: ["P50","P100","P200","P300","P400","P500","P700","P1000"],
    Dames: ["WD50","WD100","WD200","WD300","WD400","WD500"],
    Mixte: ["MX50","MX100","MX200","MX300","MX400","MXOPEN"]
  }

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold mb-4">Dashboard Club Admin</h2>

      {/* ---------- Compteurs ---------- */}
      <div className="flex space-x-6 mb-4">
        <div>Total équipes: {teams.length}</div>
        <div>Total joueurs: {clubUsers.length}</div>
      </div>

      {/* ---------- Ajouter équipe ---------- */}
      {(roles.club_admin || roles.admin) && (
        <div className="mb-6 border p-4 rounded bg-gray-800">
          <h3 className="font-bold mb-2">Ajouter une équipe</h3>
          <input
            className="p-2 mr-2"
            placeholder="Nom équipe"
            value={newTeamName}
            onChange={e => setNewTeamName(e.target.value)}
          />
          <select
            className="p-2 mr-2"
            value={newTeamGender}
            onChange={e => setNewTeamGender(e.target.value)}
          >
            {["Homme","Dames","Mixte"].map(g => (
              <option key={g} value={g}>{g}</option>
            ))}
          </select>
          <select
            className="p-2 mr-2"
            value={newTeamCategory}
            onChange={e => setNewTeamCategory(e.target.value)}
          >
            {(categories as any)[newTeamGender].map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button className="bg-yellow-400 p-2 rounded" onClick={addTeam}>Créer</button>
        </div>
      )}

      {/* ---------- Liste équipes et joueurs ---------- */}
      {teams.map(team => (
        <div key={team.id} className="border p-4 rounded mb-4 bg-gray-700">
          <h3 className="font-bold mb-2">{team.name} ({team.gender}) {team.category}</h3>

          <div className="mb-2 font-semibold">Joueurs:</div>
          <ul className="ml-4">
            {clubUsers
              .filter(u =>
                roles.admin || clubMemberships.some(c => c.club_id === team.club_id)
              )
              .map(u => (
                <li key={u.user_id}>
                  {u.first_name} {u.last_name} ({u.role})
                </li>
              ))}
          </ul>
        </div>
      ))}
    </div>
  )
}
