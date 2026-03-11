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
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [teamEditing, setTeamEditing] = useState<Team | null>(null)

  // 🔹 Map des utilisateurs pour accès rapide
  const usersById = useMemo(() => {
    const map: Record<string, ClubUser> = {}
    users.forEach(u => map[u.id] = u)
    return map
  }, [users])

  // ------------------- Fetch Data -------------------
  const fetchData = async () => {
    setLoading(true)
    try {
      const clubIds = roles.admin
        ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
        : clubMemberships.map(c => c.club_id)

      // Récupération équipes
      const { data: teamsData } = await supabase.from("teams").select("*").in("club_id", clubIds).order("name")
      setTeams(teamsData || [])

      // Récupération membres des équipes
      const teamIds = (teamsData || []).map(t => t.id)
      if (teamIds.length > 0) {
        const { data: membersData } = await supabase.from("team_memberships").select("*").in("team_id", teamIds)
        setMembers(membersData || [])
      }

      // Récupération utilisateurs du club
      const { data: clubUsersData } = await supabase
        .from("club_memberships")
        .select("user_id, users(id, first_name, last_name, email)")
        .in("club_id", clubIds)

      const clubUsersArray = Array.isArray(clubUsersData) ? clubUsersData : []
      const usersMap: Record<string, ClubUser> = {}
      clubUsersArray.forEach((m: any) => {
        if (m.users) usersMap[m.users.id] = m.users
      })
      setUsers(Object.values(usersMap))
    } catch (err) {
      console.error("Erreur dashboard:", err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  // ------------------- Formulaire -------------------
  const openForm = (team?: Team) => {
    setTeamEditing(team || { id: 'new', name: '', category: '', gender: '', club_id: clubMemberships[0]?.club_id || '' })
    setIsFormOpen(true)
  }

  const saveTeam = async () => {
    if (!teamEditing) return
    setLoading(true)
    try {
      if (teamEditing.id === 'new') {
        const { data: newTeam, error } = await supabase.from("teams").insert([teamEditing]).select().single()
        if (error) throw error
        if (newTeam) setTeams(prev => [...prev, newTeam])
      } else {
        const { error } = await supabase.from("teams").update(teamEditing).eq("id", teamEditing.id)
        if (error) throw error
        setTeams(prev => prev.map(t => t.id === teamEditing.id ? teamEditing : t))
      }
      setIsFormOpen(false)
      setTeamEditing(null)
    } catch (err) {
      console.error("Erreur sauvegarde équipe:", err)
    }
    setLoading(false)
  }

  // ------------------- Render -------------------
  return (
    <div className="space-y-6">

      {/* Header + Nouvelle équipe */}
      {(roles.admin || roles.club_admin) && (
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => openForm()}>
            + Nouvelle équipe
          </button>
        </div>
      )}

      {/* Teams Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => {
          const teamMembers = members.filter(m => m.team_id === team.id)
          return (
            <div key={team.id} className="bg-gray-800 p-4 rounded text-white">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-lg flex items-center gap-1"><MdPeople /> {team.name}</h2>
                {(roles.admin || roles.club_admin) && (
                  <button className="text-sm px-2 py-1 bg-gray-600 rounded" onClick={() => openForm(team)}>Modifier</button>
                )}
              </div>
              <p>{team.category} - {team.gender}</p>
              <div className="space-y-1 mt-2">
                {teamMembers.map(m => {
                  const u = usersById[m.user_id]
                  return <div key={m.user_id}>{u ? `${u.first_name} ${u.last_name}` : "(Inconnu)"} - {m.role}</div>
                })}
              </div>
            </div>
          )
        })}
      </div>

      {/* Formulaire inline */}
      {isFormOpen && teamEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl">
            <h2 className="text-lg mb-2 text-yellow-400">{teamEditing.id === 'new' ? "Nouvelle équipe" : "Modifier équipe"}</h2>

            <input className="w-full mb-2 p-2 rounded" placeholder="Nom" value={teamEditing.name} onChange={e => setTeamEditing({...teamEditing, name: e.target.value})} />
            <input className="w-full mb-2 p-2 rounded" placeholder="Catégorie" value={teamEditing.category} onChange={e => setTeamEditing({...teamEditing, category: e.target.value})} />
            <input className="w-full mb-2 p-2 rounded" placeholder="Genre" value={teamEditing.gender} onChange={e => setTeamEditing({...teamEditing, gender: e.target.value})} />

            {(roles.admin || roles.club_admin) && (
              <select className="w-full mb-2 p-2 rounded" value={teamEditing.club_id} onChange={e => setTeamEditing({...teamEditing, club_id: e.target.value})}>
                {roles.admin 
                  ? teams.map(t => <option key={t.club_id} value={t.club_id}>{t.club_id}</option>)
                  : clubMemberships.map(c => <option key={c.club_id} value={c.club_id}>{c.club_name}</option>)
                }
              </select>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button className="px-4 py-2 bg-gray-600 rounded" onClick={() => setIsFormOpen(false)}>Annuler</button>
              <button className="px-4 py-2 bg-blue-600 rounded" onClick={saveTeam}>Enregistrer</button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
