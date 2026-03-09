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
  const [clubIds, setClubIds] = useState<string[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1️⃣ Clubs visibles
      const clubsVisible = roles.admin
        ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
        : clubMemberships.map(c => c.club_id)
      setClubIds(clubsVisible)

      // 2️⃣ Récupérer toutes les équipes de ces clubs
      const { data: teamsData } = await supabase
        .from("teams")
        .select("*")
        .in("club_id", clubsVisible)
        .order("name", { ascending: true })
      setTeams(teamsData || [])

      // 3️⃣ Membres des équipes
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
        .in("club_id", clubsVisible)

      const usersMap: Record<string, ClubUser> = {}
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
      setLoading(false)
    }

    fetchData()
  }, [roles, clubMemberships])

  if (loading) return <div className="p-4 text-white">Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-6 text-white">

      {/* ⚡ Formulaire création équipe */}
      {(roles.admin || roles.club_admin) && (
        <AddTeamForm clubIds={clubIds} setTeams={setTeams} />
      )}

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

// ---------------------- Ajout équipe ----------------------
function AddTeamForm({ clubIds, setTeams }: { clubIds: string[]; setTeams: React.Dispatch<React.SetStateAction<Team[]>> }) {
  const [teamName, setTeamName] = useState("")
  const [category, setCategory] = useState("")
  const [gender, setGender] = useState("M")
  const [selectedClubId, setSelectedClubId] = useState(clubIds[0] || "")

  const handleAddTeam = async () => {
    if (!teamName || !selectedClubId) return
    const { data, error } = await supabase.from("teams").insert({
      name: teamName,
      category,
      gender,
      club_id: selectedClubId
    }).select("*").single()
    if (error) return console.error(error)
    setTeams(prev => [...prev, data])
    setTeamName("")
    setCategory("")
    setGender("M")
    setSelectedClubId(clubIds[0] || "")
  }

  return (
    <div className="border border-gray-500 rounded p-4 mb-4 space-y-2">
      <h3 className="font-bold">Ajouter une nouvelle équipe</h3>
      <input className="bg-gray-700 text-white p-1 rounded w-full" placeholder="Nom de l'équipe" value={teamName} onChange={e => setTeamName(e.target.value)} />
      <input className="bg-gray-700 text-white p-1 rounded w-full" placeholder="Catégorie" value={category} onChange={e => setCategory(e.target.value)} />
      <select className="bg-gray-700 text-white p-1 rounded" value={gender} onChange={e => setGender(e.target.value)}>
        <option value="M">Masculin</option>
        <option value="F">Féminin</option>
        <option value="Mixte">Mixte</option>
      </select>
      <select className="bg-gray-700 text-white p-1 rounded" value={selectedClubId} onChange={e => setSelectedClubId(e.target.value)}>
        {clubIds.map(cid => <option key={cid} value={cid}>{cid}</option>)}
      </select>
      <button className="bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded" onClick={handleAddTeam}>Ajouter l'équipe</button>
    </div>
  )
}

// ---------------------- Ajout joueur ----------------------
function AddPlayerForm({ team, members, setMembers, users }: { team: Team; members: TeamMember[]; setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>; users: ClubUser[] }) {
  const availableUsers = users.filter(u => !members.some(m => m.user_id === u.id))
  const [selectedUserId, setSelectedUserId] = useState("")

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
        {availableUsers.map(u => <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>)}
      </select>
      <button className="bg-green-600 hover:bg-green-700 px-2 rounded" onClick={handleAdd}>Ajouter</button>
    </div>
  )
}

// ---------------------- Affectation capitaine ----------------------
function AssignCaptainForm({ team, members, setMembers }: { team: Team; members: TeamMember[]; setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>> }) {
  const [selectedCaptainId, setSelectedCaptainId] = useState("")
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
        {members.filter(m => m.team_id === team.id).map(m => {
          const user = users.find(u => u.id === m.user_id)
          return <option key={m.user_id} value={m.user_id}>{user ? `${user.first_name} ${user.last_name}` : m.user_id}</option>
        })}
      </select>
      <button className="bg-yellow-600 hover:bg-yellow-700 px-2 rounded" onClick={handleAssign}>Assigner</button>
    </div>
  )
}
