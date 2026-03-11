'use client'

import { useEffect, useState, useMemo } from "react"
import { supabase } from '../../../utils/supabaseClient'
import { FiEdit } from 'react-icons/fi'
import { MdPeople } from 'react-icons/md'

type Roles = { admin: boolean; club_admin: boolean }
type ClubMembership = { club_id: string; club_name: string; role: "club_admin" | "player" }
type Team = { id: string; name: string; category: string; gender: string; club_id: string; captain_id?: string }
type ClubUser = { id: string; first_name: string; last_name: string; email: string }
type TeamMember = { team_id: string; user_id: string; role: "player" | "captain" }

type Props = { roles: Roles; clubMemberships: ClubMembership[] }

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
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

              </div>
            )
          })}
      </div>

      {/* Team Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl animate-fadeIn">
            <TeamFormModal
              team={teamToEdit}
              roles={roles}
              clubMemberships={clubMemberships}
              users={users}
              onClose={() => { setIsModalOpen(false); setTeamToEdit(undefined) }}
              onSaved={() => { setIsModalOpen(false); setTeamToEdit(undefined); setLoading(true); setTimeout(() => setLoading(false), 100) }}
              members={members}
              setMembers={setMembers}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}

// ------------------- Team Form Modal -------------------
function TeamFormModal({ team, roles, clubMemberships, users, onClose, onSaved, members, setMembers }: any) {
  const isNew = !team
  const [name, setName] = useState(team?.name || "")
  const [category, setCategory] = useState(team?.category || "")
  const [gender, setGender] = useState(team?.gender || "")
  const [clubId, setClubId] = useState<string>(team?.club_id || (roles.club_admin && clubMemberships.length === 1 ? clubMemberships[0].club_id : ""))
  const [captainId, setCaptainId] = useState<string | null>(team?.captain_id || null)
  const [selectedPlayerId, setSelectedPlayerId] = useState("")

  const availablePlayers = users.filter(u => !members.some(m => m.team_id === team?.id && m.user_id === u.id))

  const handleSave = async () => {
    if (!name || !clubId) return alert("Nom et club obligatoires")
    try {
      let savedTeam: any
      if (isNew) {
        const { data, error } = await supabase
          .from("teams")
          .insert([{ name, category, gender, club_id: clubId }])
          .select()
          .single()
        if (error) throw error
        savedTeam = data
      } else {
        const { data, error } = await supabase
          .from("teams")
          .update({ name, category, gender, club_id: clubId })
          .eq("id", team.id)
          .select()
          .single()
        if (error) throw error
        savedTeam = data
      }
      onSaved()
    } catch (err) {
      console.error(err)
      alert("Erreur sauvegarde équipe")
    }
  }

  const handleAddPlayer = async () => {
    if (!selectedPlayerId || !team?.id) return
    const { error } = await supabase
      .from("team_memberships")
      .insert({ team_id: team.id, user_id: selectedPlayerId, role: "player" })
    if (!error) setMembers([...members, { team_id: team.id, user_id: selectedPlayerId, role: "player" }])
    setSelectedPlayerId("")
  }

  const handleAssignCaptain = async (id: string) => {
    if (!team?.id) return
    const currentCaptain = members.find(m => m.team_id === team.id && m.role === "captain")
    if (currentCaptain) {
      await supabase.from("team_memberships")
        .update({ role: "player" })
        .eq("team_id", team.id)
        .eq("user_id", currentCaptain.user_id)
    }
    await supabase.from("team_memberships")
      .update({ role: "captain" })
      .eq("team_id", team.id)
      .eq("user_id", id)

    setMembers(prev => prev.map(m =>
      m.team_id === team.id
        ? m.user_id === id ? { ...m, role: "captain" } : { ...m, role: "player" }
        : m
    ))
    setCaptainId(id)
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-bold">{isNew ? "Nouvelle équipe" : "Modifier équipe"}</h2>

      <input
        className="w-full p-2 rounded bg-gray-700 text-white"
        placeholder="Nom"
        value={name}
        onChange={e => setName(e.target.value)}
      />
      <input
        className="w-full p-2 rounded bg-gray-700 text-white"
        placeholder="Catégorie"
        value={category}
        onChange={e => setCategory(e.target.value)}
      />
      <select
        className="w-full p-2 rounded bg-gray-700 text-white"
        value={gender}
        onChange={e => setGender(e.target.value)}
      >
        <option value="">-- Sélectionner --</option>
        <option value="men">Hommes</option>
        <option value="women">Femmes</option>
        <option value="mixed">Mixte</option>
      </select>

      {/* Club selection */}
      {(roles.admin || roles.club_admin) && (
        <select
          className="w-full p-2 rounded bg-gray-700 text-white"
          value={clubId}
          onChange={e => setClubId(e.target.value)}
        >
          <option value="">-- Sélectionner un club --</option>
          {(roles.admin ? clubMemberships : clubMemberships).map(c => (
            <option key={c.club_id} value={c.club_id}>{c.club_name}</option>
          ))}
        </select>
      )}

      {/* Players */}
      {team && (
        <div className="flex gap-2 flex-wrap mt-2">
          <select
            className="bg-gray-700 text-white p-1 rounded"
            value={selectedPlayerId}
            onChange={e => setSelectedPlayerId(e.target.value)}
          >
            <option value="">Ajouter joueur</option>
            {availablePlayers.map(u => (
              <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
            ))}
          </select>
          <button className="bg-green-600 hover:bg-green-700 px-2 rounded" onClick={handleAddPlayer}>Ajouter</button>
        </div>
      )}

      {/* Captain */}
      {team && (
        <div className="flex gap-2 flex-wrap mt-2">
          <select
            className="bg-gray-700 text-white p-1 rounded"
            value={captainId || ""}
            onChange={e => handleAssignCaptain(e.target.value)}
          >
            <option value="">Sélectionner capitaine</option>
            {members.filter(m => m.team_id === team.id).map(m => {
              const u = usersById[m.user_id]
              return <option key={m.user_id} value={m.user_id}>{u ? `${u.first_name} ${u.last_name}` : m.user_id}</option>
            })}
          </select>
        </div>
      )}

      <div className="flex justify-end gap-2 mt-3">
        <button className="px-4 py-2 bg-gray-500 rounded hover:bg-gray-400" onClick={onClose}>Annuler</button>
        <button className="px-4 py-2 bg-yellow-500 rounded text-black font-bold hover:bg-yellow-600" onClick={handleSave}>Sauvegarder</button>
      </div>
    </div>
  )
}
