'use client'

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = { admin: boolean; club_admin: boolean }

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
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [teamToEdit, setTeamToEdit] = useState<Team | undefined>(undefined)

  const usersById = useMemo(() => {
    const map: Record<string, ClubUser> = {}
    users.forEach(u => map[u.id] = u)
    return map
  }, [users])

  // ------------------- Fetch Data -------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const clubIds = roles.admin
          ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
          : clubMemberships.map(c => c.club_id)

        // Équipes
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .in("club_id", clubIds)
          .order("name")
        if (teamsError) throw teamsError
        setTeams(teamsData || [])

        // Membres
        const teamIds = (teamsData || []).map(t => t.id)
        if (teamIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from("team_memberships")
            .select("*")
            .in("team_id", teamIds)
          if (membersError) throw membersError
          setMembers(membersData || [])
        }

        // Users du club
        const { data: clubUsersData, error: usersError } = await supabase
          .from("club_memberships")
          .select("user_id, users(id, first_name, last_name, email)")
          .in("club_id", clubIds)
        if (usersError) throw usersError

        const usersMap: Record<string, ClubUser> = {}
        ;(clubUsersData || []).forEach((m: any) => {
          if (m.users) {
            usersMap[m.users.id] = {
              id: m.users.id,
              first_name: m.users.first_name,
              last_name: m.users.last_name,
              email: m.users.email
            }
          }
        })
        setUsers(Object.values(usersMap))

      } catch (err) {
        console.error("Erreur dashboard:", err)
      }
      setLoading(false)
    }
    fetchData()
  }, [roles, clubMemberships])

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  // ------------------- Render -------------------
  return (
    <div className="space-y-6">

      {/* Bouton nouvelle équipe */}
      {(roles.admin || roles.club_admin) && (
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          onClick={() => { setTeamToEdit(undefined); setIsModalOpen(true) }}
        >
          + Nouvelle équipe
        </button>
      )}

      {/* Modal création / édition équipe */}
      <TeamModal
        isOpen={isModalOpen}
        teamToEdit={teamToEdit}
        onClose={() => { setIsModalOpen(false); setTeamToEdit(undefined) }}
        onCreate={async ({id, name, category, gender}) => {
          if (id) {
            // MODIFICATION
            const { data, error } = await supabase
              .from("teams")
              .update({ name, category, gender })
              .eq("id", id)
              .select()
              .single()
            if (!error && data) {
              setTeams(prev => prev.map(t => t.id === id ? data : t))
            }
          } else {
            // CRÉATION
            const { data, error } = await supabase
              .from("teams")
              .insert({ name, category, gender, club_id: clubMemberships[0].club_id })
              .select()
              .single()
            if (!error && data) setTeams(prev => [...prev, data])
          }
        }}
      />

      {/* Liste des équipes en cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams
          .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
          .map(team => {
            const teamMembers = members.filter(m => m.team_id === team.id)

            return (
              <div key={team.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600 shadow hover:shadow-lg transition">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-yellow-400">{team.name}</h2>
                  {(roles.admin || roles.club_admin) && (
                    <button
                      className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-sm"
                      onClick={() => { setTeamToEdit(team); setIsModalOpen(true) }}
                    >
                      Modifier
                    </button>
                  )}
                </div>
                <p className="text-gray-300 text-sm mb-2">{team.category} - {team.gender}</p>

                {/* Membres */}
                <div className="space-y-1 mb-2">
                  {teamMembers.map(tm => {
                    const user = usersById[tm.user_id]
                    return (
                      <div key={tm.user_id} className="flex justify-between items-center text-white text-sm">
                        <span>{user ? `${user.first_name} ${user.last_name}` : "(Inconnu)"} - {tm.role}</span>
                        {(roles.admin || roles.club_admin) && (
                          <button
                            className="text-red-400 hover:text-red-600"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("team_memberships")
                                .delete()
                                .eq("team_id", tm.team_id)
                                .eq("user_id", tm.user_id)
                              if (!error) setMembers(prev => prev.filter(m => !(m.team_id === tm.team_id && m.user_id === tm.user_id)))
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Formulaires AddPlayer / AssignCaptain */}
                {(roles.admin || roles.club_admin) && (
                  <>
                    <AddPlayerForm team={team} members={members} setMembers={setMembers} users={users} />
                    <AssignCaptainForm team={team} members={members} setMembers={setMembers} usersById={usersById} />
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ------------------- Modal création / édition équipe -------------------
function TeamModal({ isOpen, onClose, onCreate, teamToEdit }: 
  { isOpen: boolean, onClose: () => void, onCreate: (team: {id?: string, name: string, category: string, gender: string}) => void, teamToEdit?: Team }) {

  const [name, setName] = useState(teamToEdit?.name || "")
  const [category, setCategory] = useState(teamToEdit?.category || "")
  const [gender, setGender] = useState(teamToEdit?.gender || "")

  useEffect(() => {
    setName(teamToEdit?.name || "")
    setCategory(teamToEdit?.category || "")
    setGender(teamToEdit?.gender || "")
  }, [teamToEdit])

  if (!isOpen) return null

  const handleSubmit = () => {
    onCreate({ id: teamToEdit?.id, name, category, gender })
    setName(""); setCategory(""); setGender("")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded w-full max-w-md">
        <h3 className="text-xl font-bold text-yellow-400 mb-4">{teamToEdit ? "Modifier l'équipe" : "Créer une nouvelle équipe"}</h3>
        <input className="w-full mb-2 p-2 rounded bg-gray-700 text-white" placeholder="Nom" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full mb-2 p-2 rounded bg-gray-700 text-white" placeholder="Catégorie" value={category} onChange={e => setCategory(e.target.value)} />
        <input className="w-full mb-4 p-2 rounded bg-gray-700 text-white" placeholder="Genre" value={gender} onChange={e => setGender(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500" onClick={onClose}>Annuler</button>
          <button className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700" onClick={handleSubmit}>{teamToEdit ? "Modifier" : "Créer"}</button>
        </div>
      </div>
    </div>
  )
}

// ---------------------- Add Player Form ----------------------
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
  const [selectedUserId, setSelectedUserId] = useState("")
  const availableUsers = users.filter(
    u => !members.some(m => m.team_id === team.id && m.user_id === u.id)
  )

  const handleAdd = async () => {
    if (!selectedUserId) return
    const { error } = await supabase
      .from("team_memberships")
      .insert({ team_id: team.id, user_id: selectedUserId, role: "player" })
    if (!error) {
      setMembers(prev => [...prev, { team_id: team.id, user_id: selectedUserId, role: "player" }])
      setSelectedUserId("")
    }
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
          <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
        ))}
      </select>
      <button className="bg-green-600 hover:bg-green-700 px-2 rounded" onClick={handleAdd}>
        Ajouter
      </button>
    </div>
  )
}

// ---------------------- Assign Captain Form ----------------------
function AssignCaptainForm({
  team,
  members,
  setMembers,
  usersById
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
  usersById: Record<string, ClubUser>
}) {
  const [selectedCaptainId, setSelectedCaptainId] = useState("")
  const teamPlayers = members.filter(m => m.team_id === team.id)
  const currentCaptain = teamPlayers.find(m => m.role === "captain")

  const handleAssign = async () => {
    if (!selectedCaptainId) return
    if (currentCaptain) {
      await supabase
        .from("team_memberships")
        .update({ role: "player" })
        .eq("team_id", team.id)
        .eq("user_id", currentCaptain.user_id)
    }
    await supabase
      .from("team_memberships")
      .update({ role: "captain" })
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
      <select
        className="bg-gray-700 text-white p-1 rounded"
        value={selectedCaptainId}
        onChange={e => setSelectedCaptainId(e.target.value)}
      >
        <option value="">Sélectionner capitaine</option>
        {teamPlayers.map(m => {
          const user = usersById[m.user_id]
          return (
            <option key={m.user_id} value={m.user_id}>
              {user ? `${user.first_name} ${user.last_name}` : m.user_id}
            </option>
          )
        })}
      </select>
      <button className="bg-yellow-600 hover:bg-yellow-700 px-2 rounded" onClick={handleAssign}>
        Assigner
      </button>
    </div>
  )
}
