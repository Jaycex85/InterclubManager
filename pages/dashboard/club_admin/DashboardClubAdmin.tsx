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
  category: string
  gender: string
  club_id: string
}

type ClubUser = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type TeamMember = {
  team_id: string
  user_id: string
  role: "player" | "captain"
}

type Props = {
  roles: Roles
  clubMemberships: ClubMembership[]
}

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1️⃣ Récupérer tous les clubs visibles pour l'utilisateur
      let clubFilter = roles.admin ? {} : { club_id: clubMemberships.map(c => c.club_id) }

      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, category, gender, club_id")
        .in("club_id", roles.admin ? undefined : clubMemberships.map(c => c.club_id))
      setTeams(teamsData || [])

      // 2️⃣ Récupérer tous les membres des équipes de ces clubs
      const { data: membersData } = await supabase
        .from("team_memberships")
        .select("team_id, user_id, role")
        .in(
          "team_id",
          (teamsData || []).map(t => t.id)
        )
      setMembers(membersData || [])

      // 3️⃣ Récupérer les infos des joueurs (users) liés au club
      const clubUserIds = [...new Set((membersData || []).map(m => m.user_id))]
      const { data: usersData } = await supabase
        .from("users")
        .select("id, auth_id")
        .in("id", clubUserIds)

      // Récupérer les infos d'auth pour first_name, last_name
      const authIds = (usersData || []).map(u => u.auth_id)
      const { data: authData } = await supabase
        .from("auth.users")
        .select("id, email, user_metadata")
        .in("id", authIds)

      const usersMap: Record<string, ClubUser> = {} as Record<string, ClubUser>
      (usersData || []).forEach(u => {
        const authUser = (authData || []).find(a => a.id === u.auth_id)
        if (authUser) {
          usersMap[u.id] = {
            id: u.id,
            first_name: authUser.user_metadata?.first_name || "",
            last_name: authUser.user_metadata?.last_name || "",
            email: authUser.email
          }
        }
      })

      setUsers(Object.values(usersMap))
      setLoading(false)
    }

    fetchData()
  }, [roles, clubMemberships])

  if (loading)
    return (
      <div className="p-4 text-white">
        Chargement des équipes et joueurs...
      </div>
    )

  return (
    <div className="space-y-6 text-white">
      {teams
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        .map(team => {
          const teamMembers = members
            .filter(m => m.team_id === team.id)
            .map(m => ({
              ...m,
              user: users.find(u => u.id === m.user_id)
            }))

          return (
            <div key={team.id} className="border border-gray-600 rounded p-4">
              <h2 className="text-lg font-bold">
                {team.name} ({team.gender}) - {team.category}
              </h2>

              {/* ⚡ Ajouter/Supprimer joueurs et capitaine */}
              <div className="mt-2 space-y-1">
                {teamMembers.map(tm => (
                  <div key={tm.user_id} className="flex justify-between items-center">
                    <span>
                      {tm.user ? `${tm.user.first_name} ${tm.user.last_name}` : "(Joueur non trouvé)"} - {tm.role}
                    </span>
                    {(roles.admin || roles.club_admin) && (
                      <button
                        className="text-red-400 hover:text-red-600"
                        onClick={async () => {
                          await supabase
                            .from("team_memberships")
                            .delete()
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

              {/* ⚡ Ajouter un joueur depuis club_memberships */}
              {(roles.admin || roles.club_admin) && (
                <AddPlayerForm team={team} members={members} setMembers={setMembers} users={users} />
              )}

              {/* ⚡ Affecter un capitaine */}
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
function AddPlayerForm({
  team,
  members,
  setMembers,
  users
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
  users: ClubUser[]
}) {
  const availableUsers = users.filter(u => !members.some(m => m.user_id === u.id))
  const [selectedUserId, setSelectedUserId] = useState<string>("")

  const handleAdd = async () => {
    if (!selectedUserId) return
    await supabase.from("team_memberships").insert({
      team_id: team.id,
      user_id: selectedUserId,
      role: "player"
    })
    setMembers(prev => [...prev, { team_id: team.id, user_id: selectedUserId, role: "player" }])
    setSelectedUserId("")
  }

  return (
    <div className="mt-2 flex gap-2">
      <select
        className="bg-gray-700 text-white p-1 rounded"
        value={selectedUserId}
        onChange={e => setSelectedUserId(e.target.value)}
      >
        <option value="">Sélectionner un joueur</option>
        {availableUsers.map(u => (
          <option key={u.id} value={u.id}>
            {u.first_name} {u.last_name}
          </option>
        ))}
      </select>
      <button
        className="bg-green-600 hover:bg-green-700 px-2 rounded"
        onClick={handleAdd}
      >
        Ajouter
      </button>
    </div>
  )
}

// ---------------------- Affectation capitaine ----------------------
function AssignCaptainForm({
  team,
  members,
  setMembers
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
}) {
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>("")

  const currentCaptain = members.find(m => m.team_id === team.id && m.role === "captain")

  const handleAssign = async () => {
    if (!selectedCaptainId) return
    // 1️⃣ Réinitialiser capitaine actuel
    if (currentCaptain) {
      await supabase
        .from("team_memberships")
        .update({ role: "player" })
        .eq("team_id", team.id)
        .eq("user_id", currentCaptain.user_id)
    }
    // 2️⃣ Assigner nouveau capitaine
    await supabase
      .from("team_memberships")
      .update({ role: "captain" })
      .eq("team_id", team.id)
      .eq("user_id", selectedCaptainId)

    setMembers(prev =>
      prev.map(m =>
        m.team_id === team.id
          ? m.user_id === selectedCaptainId
            ? { ...m, role: "captain" }
            : { ...m, role: "player" }
          : m
      )
    )
    setSelectedCaptainId("")
  }

  return (
    <div className="mt-2 flex gap-2">
      <select
        className="bg-gray-700 text-white p-1 rounded"
        value={selectedCaptainId}
        onChange={e => setSelectedCaptainId(e.target.value)}
      >
        <option value="">Sélectionner capitaine</option>
        {members
          .filter(m => m.team_id === team.id)
          .map(m => (
            <option key={m.user_id} value={m.user_id}>
              {m.user_id}
            </option>
          ))}
      </select>
      <button
        className="bg-yellow-600 hover:bg-yellow-700 px-2 rounded"
        onClick={handleAssign}
      >
        Assigner
      </button>
    </div>
  )
}
