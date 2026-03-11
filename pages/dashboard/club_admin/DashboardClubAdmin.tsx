'use client'

import { useEffect, useState, useMemo } from "react"
import { supabase } from '../../../utils/supabaseClient'
import { FiEdit } from 'react-icons/fi'
import { MdPeople } from 'react-icons/md'

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
  const [allClubs, setAllClubs] = useState<{id:string,name:string}[]>([])
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
        let clubIds: string[] = []
        let clubsData: {id:string,name:string}[] = []

        if (roles.admin) {
          const { data, error } = await supabase.from("clubs").select("id,name").order("name")
          if (error) throw error
          clubsData = data || []
          clubIds = clubsData.map(c => c.id)
        } else {
          clubIds = clubMemberships.map(c => c.club_id)
          const { data, error } = await supabase.from("clubs").select("id,name").in("id", clubIds)
          if (error) throw error
          clubsData = data || []
        }

        setAllClubs(clubsData)

        // Teams
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .in("club_id", clubIds)
          .order("name")
        if (teamsError) throw teamsError
        setTeams(teamsData || [])

        // Team members
        const teamIds = (teamsData || []).map(t => t.id)
        if (teamIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from("team_memberships")
            .select("*")
            .in("team_id", teamIds)
          if (membersError) throw membersError
          setMembers(membersData || [])
        }

        // Club users
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
      {/* Header + Nouvelle équipe */}
      {(roles.admin || roles.club_admin) && (
        <div className="flex justify-end">
          <button
            className="px-4 py-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded shadow-md transition"
            onClick={() => { setTeamToEdit(undefined); setIsModalOpen(true) }}
          >
            + Nouvelle équipe
          </button>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teams
          .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
          .map(team => {
            const teamMembers = members.filter(m => m.team_id === team.id)
            return (
              <div key={team.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600 shadow hover:shadow-lg transition flex flex-col justify-between">
                {/* Header */}
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-lg font-bold text-yellow-400 flex items-center gap-1">
                    <MdPeople /> {team.name}
                  </h2>
                  {(roles.admin || roles.club_admin) && (
                    <button
                      className="bg-gray-600 hover:bg-gray-500 px-2 py-1 rounded text-sm flex items-center gap-1"
                      onClick={() => { setTeamToEdit(team); setIsModalOpen(true) }}
                    >
                      <FiEdit /> Modifier
                    </button>
                  )}
                </div>

                <p className="text-gray-300 text-sm mb-2">{team.category} - {team.gender}</p>

                {/* Members */}
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
                              else console.error("Erreur suppr membre:", error)
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Forms */}
                {(roles.admin || roles.club_admin) && (
                  <div className="flex flex-col gap-2 mt-2">
                    <AddPlayerForm
                      team={team}
                      members={members}
                      setMembers={setMembers}
                      users={users.filter(u => roles.admin ? true : clubMemberships.some(cm => cm.club_id === team.club_id))}
                      roles={roles}
                      clubMemberships={clubMemberships}
                    />
                    <AssignCaptainForm
                      team={team}
                      members={members}
                      setMembers={setMembers}
                      usersById={usersById}
                      roles={roles}
                      clubMemberships={clubMemberships}
                    />
                  </div>
                )}
              </div>
            )
          })}
      </div>

      {/* Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-md shadow-xl">
            <h3 className="text-xl font-bold text-yellow-400 mb-4">{teamToEdit ? "Modifier l'équipe" : "Créer une nouvelle équipe"}</h3>

            <TeamForm
              roles={roles}
              clubMemberships={clubMemberships}
              allClubs={allClubs}
              users={users}
              teamToEdit={teamToEdit}
              setTeamToEdit={setTeamToEdit}
              onSaved={() => setIsModalOpen(false)}
            />

            <div className="flex justify-end gap-2 mt-4">
              <button className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500" onClick={() => setIsModalOpen(false)}>Annuler</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ------------------- Team Form -------------------
function TeamForm({
  roles,
  clubMemberships,
  allClubs,
  users,
  teamToEdit,
  setTeamToEdit,
  onSaved
}: {
  roles: Roles
  clubMemberships: ClubMembership[]
  allClubs: {id:string,name:string}[]
  users: ClubUser[]
  teamToEdit?: Team
  setTeamToEdit: React.Dispatch<React.SetStateAction<Team|undefined>>
  onSaved: () => void
}) {
  const isNew = !teamToEdit

  const [name, setName] = useState(teamToEdit?.name || "")
  const [category, setCategory] = useState(teamToEdit?.category || "")
  const [gender, setGender] = useState(teamToEdit?.gender || "")
  const [clubId, setClubId] = useState(teamToEdit?.club_id || (roles.club_admin ? clubMemberships[0]?.club_id : allClubs[0]?.id) || "")

  const handleSubmit = async () => {
    const payload = { name, category, gender, club_id: clubId } // Plus de captain_id

    if (isNew) {
      const { data, error } = await supabase.from("teams").insert([payload]).select().single()
      if (error) console.error("Erreur insert team:", error)
      else onSaved()
    } else {
      const { data, error } = await supabase.from("teams").update(payload).eq("id", teamToEdit!.id).select()
      if (error) console.error("Erreur update team:", error)
      else onSaved()
    }
  }

  return (
    <div className="space-y-2">
      <div>
        <label className="block mb-1">Nom</label>
        <input className="w-full p-2 rounded bg-gray-700 text-white" value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1">Catégorie</label>
        <input className="w-full p-2 rounded bg-gray-700 text-white" value={category} onChange={e => setCategory(e.target.value)} />
      </div>
      <div>
        <label className="block mb-1">Genre</label>
        <select className="w-full p-2 rounded bg-gray-700 text-white" value={gender} onChange={e => setGender(e.target.value)}>
          <option value="">-- Sélectionner --</option>
          <option value="Hommes">Hommes</option>
          <option value="Femmes">Femmes</option>
          <option value="Mixte">Mixte</option>
        </select>
      </div>
      {roles.admin && (
        <div>
          <label className="block mb-1">Club</label>
          <select className="w-full p-2 rounded bg-gray-700 text-white" value={clubId} onChange={e => setClubId(e.target.value)}>
            {allClubs.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
      )}
      <div className="flex justify-end gap-2 mt-2">
        <button className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 text-white font-bold" onClick={handleSubmit}>{isNew ? "Créer" : "Enregistrer"}</button>
      </div>
    </div>
  )
}

// ---------------------- Add Player Form ----------------------
function AddPlayerForm({
  team,
  members,
  setMembers,
  users,
  roles,
  clubMemberships
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
  users: ClubUser[]
  roles: Roles
  clubMemberships: ClubMembership[]
}) {
  const [selectedUserId, setSelectedUserId] = useState("")

  const availableUsers = users.filter(u =>
    (!members.some(m => m.team_id === team.id && m.user_id === u.id)) &&
    (roles.admin || clubMemberships.some(cm => cm.club_id === team.club_id))
  )

  const handleAdd = async () => {
    if (!selectedUserId) return
    const { data, error } = await supabase
      .from("team_memberships")
      .insert([{ team_id: team.id, user_id: selectedUserId, role: "player" }])
      .select()
    if (!error && data?.length) {
      setMembers(prev => [...prev, { team_id: team.id, user_id: selectedUserId, role: "player" }])
      setSelectedUserId("")
    } else console.error("Erreur ajout joueur:", error)
  }

  return (
    <div className="flex gap-2 flex-wrap">
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

// ---------------------- Assign Captain Form ----------------------
function AssignCaptainForm({
  team,
  members,
  setMembers,
  usersById,
  roles,
  clubMemberships
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
  usersById: Record<string, ClubUser>
  roles: Roles
  clubMemberships: ClubMembership[]
}) {
  const [selectedCaptainId, setSelectedCaptainId] = useState("")

  const teamPlayers = members.filter(m =>
    m.team_id === team.id &&
    (roles.admin || clubMemberships.some(cm => cm.club_id === team.club_id))
  )

  const currentCaptain = teamPlayers.find(m => m.role === "captain")

  const handleAssign = async () => {
    if (!selectedCaptainId) return

    if (currentCaptain) {
      const { error } = await supabase.from("team_memberships")
        .update({ role: "player" })
        .eq("team_id", team.id)
        .eq("user_id", currentCaptain.user_id)
      if (error) console.error("Erreur reset capitaine:", error)
    }

    const { error } = await supabase.from("team_memberships")
      .update({ role: "captain" })
      .eq("team_id", team.id)
      .eq("user_id", selectedCaptainId)
    if (error) console.error("Erreur assign capitaine:", error)

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
    <div className="flex gap-2 flex-wrap">
      <select className="bg-gray-700 text-white p-1 rounded" value={selectedCaptainId} onChange={e => setSelectedCaptainId(e.target.value)}>
        <option value="">Sélectionner capitaine</option>
        {teamPlayers.map(m => {
          const user = usersById[m.user_id]
          return <option key={m.user_id} value={m.user_id}>{user ? `${user.first_name} ${user.last_name}` : m.user_id}</option>
        })}
      </select>
      <button className="bg-yellow-600 hover:bg-yellow-700 px-2 rounded" onClick={handleAssign}>Assigner</button>
    </div>
  )
}
