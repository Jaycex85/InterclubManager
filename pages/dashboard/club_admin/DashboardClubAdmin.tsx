'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = { admin: boolean; club_admin: boolean }
type ClubMembership = { club_id: string; club_name: string; role: "club_admin" | "player" }
type Team = { id: string; name: string; category: string; gender: string; club_id: string }
type ClubUser = { id: string; first_name: string; last_name: string; email: string }
type TeamMember = { team_id: string; user_id: string; role: "player" | "captain" }

type Props = { roles: Roles; clubMemberships: ClubMembership[] }

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1️⃣ Récupérer clubs visibles pour l’utilisateur
      const clubIds = roles.admin
        ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
        : clubMemberships.map(c => c.club_id)

      // 2️⃣ Récupérer toutes les équipes de ces clubs
      const { data: teamsData } = await supabase
        .from("teams")
        .select("*")
        .in("club_id", clubIds)
        .order("name", { ascending: true })
      setTeams(teamsData || [])

      // 3️⃣ Récupérer les membres des équipes
      const teamIds = (teamsData || []).map(t => t.id)
      const { data: membersData } = await supabase
        .from("team_memberships")
        .select("*")
        .in("team_id", teamIds)
      setMembers(membersData || [])

// 4️⃣ Récupérer tous les utilisateurs liés aux clubs
const { data: clubUsersData } = await supabase
  .from("club_memberships")
  .select("user_id, users(first_name, last_name, email)")
  .in("club_id", clubIds)

// Correction TS : type explicite avec as Record<...>
const usersMap = {} as Record<string, ClubUser>

(clubUsersData || []).forEach((m: any) => {
  if (m.users && !usersMap[m.user_id]) {
    usersMap[m.user_id] = {
      id: m.user_id,
      first_name: m.users.first_name,
      last_name: m.users.last_name,
      email: m.users.email
    }
  }
})

setUsers(Object.values(usersMap))
      setUsers(Object.values(usersMap))
      setLoading(false)
    }

    fetchData()
  }, [roles, clubMemberships])

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-6 text-white">
      {teams
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        .map(team => {
          const teamMembers = members
            .filter(m => m.team_id === team.id)
            .map(m => ({ ...m, user: users.find(u => u.id === m.user_id) }))

          return (
            <div key={team.id} className="border border-gray-600 rounded p-4">
              <h2 className="text-lg font-bold">
                {team.name} ({team.gender}) - {team.category}
              </h2>

              {/* ⚡ Joueurs */}
              <div className="mt-2 space-y-1">
                {teamMembers.map(tm => (
                  <div key={tm.user_id} className="flex justify-between items-center">
                    <span>{tm.user ? `${tm.user.first_name} ${tm.user.last_name}` : "(Joueur non trouvé)"} - {tm.role}</span>
                    {(roles.admin || roles.club_admin) && (
                      <button
                        className="text-red-400 hover:text-red-600"
                        onClick={async () => {
                          await supabase.from("team_memberships").delete()
                            .eq("team_id", tm.team_id)
                            .eq("user_id", tm.user_id)
                          setMembers(prev => prev.filter(m => !(m.team_id === tm.team_id && m.user_id === tm.user_id)))
                        }}
                      >
                        Supprimer
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* ⚡ Ajouter joueur */}
              {(roles.admin || roles.club_admin) && (
                <AddPlayerForm team={team} members={members} setMembers={setMembers} users={users} />
              )}

              {/* ⚡ Affecter capitaine */}
              {(roles.admin || roles.club_admin) && (
                <AssignCaptainForm team={team} members={members} setMembers={setMembers} />
              )}
            </div>
          )
        })}
    </div>
  )
}

// ---------------------- Ajout joueur ----------------------
function AddPlayerForm({ team, members, setMembers, users }: { team: Team; members: TeamMember[]; setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>; users: ClubUser[] }) {
  const availableUsers = users.filter(u => !members.some(m => m.user_id === u.id))
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  const handleAdd = async () => {
    if (!selectedUserId) return
    await supabase.from("team_memberships").insert({ team_id: team.id, user_id: selectedUserId, role: "player" })
    setMembers(prev => [...prev, { team_id: team.id, user_id: selectedUserId, role: "player" }])
    setSelectedUserId("")
  }

  return (
    <div className="mt-2 flex gap-2">
      <select className="bg-gray-700 text-white p-1 rounded" value={selectedUserId} onChange={e => setSelectedUserId(e.target.value)}>
        <option value="">Sélectionner un joueur</option>
        {availableUsers.map(u => (
          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
        ))}
      </select>
      <button className="bg-green-600 hover:bg-green-700 px-2 rounded" onClick={handleAdd}>Ajouter</button>
    </div>
  )
}

// ---------------------- Affectation capitaine ----------------------
function AssignCaptainForm({ team, members, setMembers }: { team: Team; members: TeamMember[]; setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>> }) {
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>("")
  const currentCaptain = members.find(m => m.team_id === team.id && m.role === "captain")

  const handleAssign = async () => {
    if (!selectedCaptainId) return
    if (currentCaptain) {
      await supabase.from("team_memberships").update({ role: "player" })
        .eq("team_id", team.id)
        .eq("user_id", currentCaptain.user_id)
    }
    await supabase.from("team_memberships").update({ role: "captain" })
      .eq("team_id", team.id)
      .eq("user_id", selectedCaptainId)

    setMembers(prev =>
      prev.map(m =>
        m.team_id === team.id
          ? m.user_id === selectedCaptainId ? { ...m, role: "captain" } : { ...m, role: "player" }
          : m
      )
    )
    setSelectedCaptainId("")
  }

  return (
    <div className="mt-2 flex gap-2">
      <select className="bg-gray-700 text-white p-1 rounded" value={selectedCaptainId} onChange={e => setSelectedCaptainId(e.target.value)}>
        <option value="">Sélectionner capitaine</option>
        {members.filter(m => m.team_id === team.id).map(m => (
          <option key={m.user_id} value={m.user_id}>{m.user_id}</option>
        ))}
      </select>
      <button className="bg-yellow-600 hover:bg-yellow-700 px-2 rounded" onClick={handleAssign}>Assigner</button>
    </div>
  )
}
