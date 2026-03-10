'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

export type EditUserProps = {
  userId: string
  onSaved: () => void
  onClose?: () => void
}

type ClubMembership = {
  id: string
  club_id: string
  club_name?: string
  role: 'club_admin' | 'player'
}

type TeamMembership = {
  id: string
  team_id: string
  team_name?: string
  role: 'player'
}

type UserData = {
  email: string
  first_name?: string
  last_name?: string
  memberships: ClubMembership[]
  teamMemberships: TeamMembership[]
}

export default function EditUser({ userId, onSaved, onClose }: EditUserProps) {
  const [user, setUser] = useState<UserData>({
    email: '',
    first_name: '',
    last_name: '',
    memberships: [],
    teamMemberships: [],
  })

  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
  const [teams, setTeams] = useState<{ id: string; name: string; club_id: string }[]>([])
  const [loading, setLoading] = useState(false)

  /** Fetch user + memberships + clubs + teams */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // User data
      const { data: u, error: userErr } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single()
      if (!userErr && u) {
        setUser(prev => ({ ...prev, email: u.email, first_name: u.first_name || '', last_name: u.last_name || '' }))
      }

      // Club memberships
      const { data: cm, error: cmErr } = await supabase
        .from('club_memberships')
        .select('id, club_id, role, club:name')
        .eq('user_id', userId)
      const mappedClubs = (cm || []).map((m: any) => ({
        id: m.id,
        club_id: m.club_id,
        club_name: m.club?.name,
        role: m.role,
      }))
      setUser(prev => ({ ...prev, memberships: mappedClubs }))

      // Team memberships
      const { data: tm, error: tmErr } = await supabase
        .from('team_memberships')
        .select('id, team_id, role, team:name')
        .eq('user_id', userId)
      const mappedTeams = (tm || []).map((t: any) => ({
        id: t.id,
        team_id: t.team_id,
        team_name: t.team?.name,
        role: t.role,
      }))
      setUser(prev => ({ ...prev, teamMemberships: mappedTeams }))

      // All clubs
      const { data: clubsData } = await supabase.from('clubs').select('id, name').order('name')
      if (clubsData) setClubs(clubsData)

      // All teams (we'll filter dynamically by club later)
      const { data: teamsData } = await supabase.from('teams').select('id, name, club_id').order('name')
      if (teamsData) setTeams(teamsData)

      setLoading(false)
    }

    fetchData()
  }, [userId])

  /** Handlers */
  const handleUserField = (field: keyof UserData, value: string) => {
    setUser(prev => ({ ...prev, [field]: value }))
  }

  const handleClubMembership = (club_id: string, role: 'club_admin' | 'player' | '') => {
    setUser(prev => {
      const exists = prev.memberships.find(m => m.club_id === club_id)
      if (!role) {
        // Remove membership + related team memberships
        return {
          ...prev,
          memberships: prev.memberships.filter(m => m.club_id !== club_id),
          teamMemberships: prev.teamMemberships.filter(tm => {
            const team = teams.find(t => t.id === tm.team_id)
            return team?.club_id !== club_id
          }),
        }
      }
      if (exists) {
        return { ...prev, memberships: prev.memberships.map(m => (m.club_id === club_id ? { ...m, role } : m)) }
      } else {
        return { ...prev, memberships: [...prev.memberships, { id: '', club_id, role }] }
      }
    })
  }

  const handleTeamMembership = (team_id: string, role: 'player' | '') => {
    setUser(prev => {
      const exists = prev.teamMemberships.find(tm => tm.team_id === team_id)
      if (!role) {
        return { ...prev, teamMemberships: prev.teamMemberships.filter(tm => tm.team_id !== team_id) }
      }
      if (exists) {
        return { ...prev, teamMemberships: prev.teamMemberships.map(tm => (tm.team_id === team_id ? { ...tm, role } : tm)) }
      } else {
        return { ...prev, teamMemberships: [...prev.teamMemberships, { id: '', team_id, role }] }
      }
    })
  }

  /** Save user + memberships + team memberships */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Update user info
    const { error: userErr } = await supabase
      .from('users')
      .update({ first_name: user.first_name, last_name: user.last_name })
      .eq('id', userId)
    if (userErr) alert(userErr.message)

    // Club memberships
    for (const m of user.memberships) {
      if (!m.id) {
        const { error } = await supabase.from('club_memberships').insert([{ user_id: userId, club_id: m.club_id, role: m.role }])
        if (error) console.error(error)
      } else {
        const { error } = await supabase.from('club_memberships').update({ role: m.role }).eq('id', m.id)
        if (error) console.error(error)
      }
    }

    // Remove memberships deleted
    const allIds = user.memberships.map(m => m.id).filter(Boolean)
    const { error: delErr } = await supabase
      .from('club_memberships')
      .delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${allIds.join(',') || 'NULL'})`)
    if (delErr) console.error(delErr)

    // Team memberships
    for (const tm of user.teamMemberships) {
      if (!tm.id) {
        const { error } = await supabase.from('team_memberships').insert([{ user_id: userId, team_id: tm.team_id, role: tm.role }])
        if (error) console.error(error)
      } else {
        const { error } = await supabase.from('team_memberships').update({ role: tm.role }).eq('id', tm.id)
        if (error) console.error(error)
      }
    }

    // Remove memberships deleted
    const allTeamIds = user.teamMemberships.map(tm => tm.id).filter(Boolean)
    const { error: delTmErr } = await supabase
      .from('team_memberships')
      .delete()
      .eq('user_id', userId)
      .not('id', 'in', `(${allTeamIds.join(',') || 'NULL'})`)
    if (delTmErr) console.error(delTmErr)

    setLoading(false)
    onSaved()
  }

  /** Compute teams to show based on selected clubs */
  const userClubIds = user.memberships.map(m => m.club_id)
  const filteredTeams = teams.filter(t => userClubIds.includes(t.club_id))

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      {loading && <p>Chargement...</p>}

      <div>
        <label className="block mb-1">Email</label>
        <input type="email" value={user.email} disabled className="w-full p-2 rounded bg-gray-800 text-white cursor-not-allowed" />
      </div>

      <div>
        <label className="block mb-1">Prénom</label>
        <input type="text" value={user.first_name} onChange={e => handleUserField('first_name', e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white" />
      </div>

      <div>
        <label className="block mb-1">Nom</label>
        <input type="text" value={user.last_name} onChange={e => handleUserField('last_name', e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white" />
      </div>

      {/* Clubs */}
      <div className="space-y-2">
        <label className="block mb-1 font-bold">Clubs</label>
        {clubs.map(c => {
          const membership = user.memberships.find(m => m.club_id === c.id)
          return (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-32">{c.name}</span>
              <select value={membership?.role || ''} onChange={e => handleClubMembership(c.id, e.target.value as 'club_admin' | 'player' | '')} className="p-1 rounded bg-gray-800 text-white">
                <option value="">Non lié</option>
                <option value="player">Player</option>
                <option value="club_admin">Admin Club</option>
              </select>
            </div>
          )
        })}
      </div>

      {/* Teams */}
      {filteredTeams.length > 0 && (
        <div className="space-y-2 mt-4">
          <label className="block mb-1 font-bold">Teams (optionnel)</label>
          {filteredTeams.map(t => {
            const teamMembership = user.teamMemberships.find(tm => tm.team_id === t.id)
            return (
              <div key={t.id} className="flex items-center gap-2">
                <span className="w-32">{t.name}</span>
                <select value={teamMembership?.role || ''} onChange={e => handleTeamMembership(t.id, e.target.value as 'player' | '')} className="p-1 rounded bg-gray-800 text-white">
                  <option value="">Non lié</option>
                  <option value="player">Player</option>
                </select>
              </div>
            )
          })}
        </div>
      )}

      <div className="flex gap-2 mt-4">
        <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold" disabled={loading}>Enregistrer</button>
        {onClose && <button type="button" onClick={onClose} className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold">Fermer</button>}
      </div>
    </form>
  )
}
