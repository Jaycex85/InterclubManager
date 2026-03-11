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
  const [formMembers, setFormMembers] = useState<string[]>([]) // user_ids selected
  const [formCaptain, setFormCaptain] = useState<string>('') // user_id

  const usersById = useMemo(() => {
    const map: Record<string, ClubUser> = {}
    users.forEach(u => map[u.id] = u)
    return map
  }, [users])

  const fetchData = async () => {
    setLoading(true)
    try {
      const clubIds = roles.admin
        ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
        : clubMemberships.map(c => c.club_id)

      const { data: teamsData } = await supabase.from("teams").select("*").in("club_id", clubIds).order("name")
      setTeams(teamsData || [])

      const teamIds = (teamsData || []).map(t => t.id)
      if (teamIds.length > 0) {
        const { data: membersData } = await supabase.from("team_memberships").select("*").in("team_id", teamIds)
        setMembers(membersData || [])
      }

      const { data: clubUsersData } = await supabase
        .from("club_memberships")
        .select("user_id, users(id, first_name, last_name, email)")
        .in("club_id", clubIds)

      const usersMap: Record<string, ClubUser> = {}
      (clubUsersData || []).forEach((m: any) => {
        if (m.users) usersMap[m.users.id] = m.users
      })
      setUsers(Object.values(usersMap))
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div>Chargement...</div>

  const openForm = (team?: Team) => {
    setTeamEditing(team || { id: 'new', name: '', category: '', gender: '', club_id: clubMemberships[0]?.club_id || '' })
    const teamMembers = team ? members.filter(m => m.team_id === team.id).map(m => m.user_id) : []
    setFormMembers(teamMembers)
    setFormCaptain(team?.captain_id || '')
    setIsFormOpen(true)
  }

  const saveTeam = async () => {
    if (!teamEditing) return
    setLoading(true)
    try {
      let savedTeam: Team | null = null
      if (teamEditing.id === 'new') {
        const { data: newTeam } = await supabase.from("teams").insert([teamEditing]).select().single()
        savedTeam = newTeam || null
        if (savedTeam) setTeams(prev => [...prev, savedTeam])
      } else {
        const { data: updatedTeam } = await supabase.from("teams").update(teamEditing).eq("id", teamEditing.id).select().single()
        savedTeam = updatedTeam || null
        if (savedTeam) setTeams(prev => prev.map(t => t.id === savedTeam!.id ? savedTeam! : t))
      }

      if (savedTeam) {
        // Supprimer tous les membres existants et ré-inserer
        await supabase.from("team_memberships").delete().eq("team_id", savedTeam.id)
        const newMembers = formMembers.map(uid => ({
          team_id: savedTeam.id,
          user_id: uid,
          role: uid === formCaptain ? "captain" : "player"
        }))
        if (newMembers.length > 0) await supabase.from("team_memberships").insert(newMembers)
        setMembers(prev => [...prev.filter(m => m.team_id !== savedTeam.id), ...newMembers])
      }

      setIsFormOpen(false)
      setTeamEditing(null)
      setFormMembers([])
      setFormCaptain('')
    } catch (err) { console.error(err) }
    setLoading(false)
  }

  return (
    <div className="space-y-6">

      {(roles.admin || roles.club_admin) && (
        <div className="flex justify-end">
          <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={() => openForm()}>
            + Nouvelle équipe
          </button>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {teams.map(team => (
          <div key={team.id} className="bg-gray-800 p-4 rounded text-white">
            <div className="flex justify-between items-center mb-2">
              <h2 className="text-lg flex items-center gap-1"><MdPeople /> {team.name}</h2>
              {(roles.admin || roles.club_admin) && (
                <button className="text-sm px-2 py-1 bg-gray-600 rounded" onClick={() => openForm(team)}>Modifier</button>
              )}
            </div>
            <p>{team.category} - {team.gender}</p>
            <div className="space-y-1 mt-2">
              {members.filter(m => m.team_id === team.id).map(m => {
                const u = usersById[m.user_id]
                return <div key={m.user_id}>{u ? `${u.first_name} ${u.last_name}` : "(Inconnu)"} - {m.role}</div>
              })}
            </div>
          </div>
        ))}
      </div>

      {isFormOpen && teamEditing && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-xl space-y-2">
            <h2 className="text-lg mb-2 text-yellow-400">{teamEditing.id === 'new' ? "Nouvelle équipe" : "Modifier équipe"}</h2>

            <input className="w-full p-2 rounded" placeholder="Nom" value={teamEditing.name} onChange={e => setTeamEditing({...teamEditing, name: e.target.value})} />
            <input className="w-full p-2 rounded" placeholder="Catégorie" value={teamEditing.category} onChange={e => setTeamEditing({...teamEditing, category: e.target.value})} />
            <input className="w-full p-2 rounded" placeholder="Genre" value={teamEditing.gender} onChange={e => setTeamEditing({...teamEditing, gender: e.target.value})} />

            {(roles.admin || roles.club_admin) && (
              <select className="w-full p-2 rounded" value={teamEditing.club_id} onChange={e => setTeamEditing({...teamEditing, club_id: e.target.value})}>
                {roles.admin 
                  ? teams.map(t => <option key={t.club_id} value={t.club_id}>{t.club_id}</option>)
                  : clubMemberships.map(c => <option key={c.club_id} value={c.club_id}>{c.club_name}</option>)
                }
              </select>
            )}

            <div className="space-y-1">
              <label className="font-semibold text-gray-200">Joueurs / Capitaine</label>
              <select className="w-full p-2 rounded" multiple value={formMembers} onChange={e => {
                const options = Array.from(e.target.selectedOptions).map(o => o.value)
                setFormMembers(options)
                if (!options.includes(formCaptain)) setFormCaptain('')
              }}>
                {users.map(u => (
                  <option key={u.id} value={u.id}>{u.first_name} {u.last_name}</option>
                ))}
              </select>

              <label className="font-semibold text-gray-200 mt-1">Capitaine</label>
              <select className="w-full p-2 rounded" value={formCaptain} onChange={e => setFormCaptain(e.target.value)}>
                <option value="">Sélectionner</option>
                {formMembers.map(uid => {
                  const u = usersById[uid]
                  return <option key={uid} value={uid}>{u ? `${u.first_name} ${u.last_name}` : uid}</option>
                })}
              </select>
            </div>

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
