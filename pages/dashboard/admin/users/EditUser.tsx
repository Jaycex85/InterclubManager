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
  team_id?: string | null
  team_name?: string
}

type UserData = {
  email: string
  first_name?: string
  last_name?: string
  memberships: ClubMembership[]
}

type Club = { id: string; name: string }
type Team = { id: string; name: string; club_id: string }

export default function EditUser({ userId, onSaved, onClose }: EditUserProps) {
  const [user, setUser] = useState<UserData>({
    email: '',
    first_name: '',
    last_name: '',
    memberships: [],
  })

  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)

  /** FETCH USER, CLUB MEMBERSHIPS, CLUBS, TEAMS */
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // User info
      const { data: u, error: userErr } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single()
      if (!userErr && u) {
        setUser(prev => ({ ...prev, email: u.email, first_name: u.first_name || '', last_name: u.last_name || '' }))
      }

      // Club memberships
      const { data: memberships, error: memErr } = await supabase
        .from('club_memberships')
        .select('id, club_id, role, team_id, club:name, team:name')
        .eq('user_id', userId)
      if (!memErr && memberships) {
        const mapped = memberships.map((m: any) => ({
          id: m.id,
          club_id: m.club_id,
          club_name: m.club?.name,
          role: m.role,
          team_id: m.team_id || null,
          team_name: m.team?.name || null
        }))
        setUser(prev => ({ ...prev, memberships: mapped }))
        if (mapped[0]) setSelectedClubId(mapped[0].club_id)
      }

      // All clubs
      const { data: clubsData } = await supabase.from('clubs').select('id, name').order('name')
      if (clubsData) setClubs(clubsData)

      // All teams (pour filtrage par club)
      const { data: teamsData } = await supabase.from('teams').select('id, name, club_id').order('name')
      if (teamsData) setTeams(teamsData)

      setLoading(false)
    }

    fetchData()
  }, [userId])

  /** Handle field changes */
  const handleChange = (field: keyof UserData, value: string) => {
    setUser(prev => ({ ...prev, [field]: value }))
  }

  /** Handle club membership role change */
  const handleMembershipChange = (
    club_id: string,
    role: 'club_admin' | 'player' | ''
  ) => {
    setUser(prev => {
      const exists = prev.memberships.find(m => m.club_id === club_id)
      if (!role) {
        return { ...prev, memberships: prev.memberships.filter(m => m.club_id !== club_id) }
      }
      if (exists) {
        return {
          ...prev,
          memberships: prev.memberships.map(m => (m.club_id === club_id ? { ...m, role } : m))
        }
      }
      return {
        ...prev,
        memberships: [
          ...prev.memberships.filter(m => m.club_id !== club_id),
          { id: '', club_id, role }
        ]
      }
    })
    setSelectedClubId(club_id)
  }

  /** Handle team selection for the selected club */
  const handleTeamChange = (club_id: string, team_id: string | '') => {
    setUser(prev => ({
      ...prev,
      memberships: prev.memberships.map(m =>
        m.club_id === club_id ? { ...m, team_id: team_id || null, team_name: teams.find(t => t.id === team_id)?.name } : m
      )
    }))
  }

  /** Save changes */
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Update user info
    const { error: userErr } = await supabase
      .from('users')
      .update({ first_name: user.first_name, last_name: user.last_name })
      .eq('id', userId)
    if (userErr) alert(userErr.message)

    // Update memberships
    for (const m of user.memberships) {
      try {
        if (!m.id) {
          await supabase.from('club_memberships').insert([
            {
              user_id: userId,
              club_id: m.club_id,
              role: m.role,
              team_id: m.team_id || null
            }
          ])
        } else {
          await supabase
            .from('club_memberships')
            .update({ role: m.role, team_id: m.team_id || null })
            .eq('id', m.id)
        }
      } catch (err: any) {
        console.error('Erreur membership', err)
        alert(`Impossible de mettre à jour le club ${m.club_name}: ${err.message}`)
      }
    }

    setLoading(false)
    onSaved()
  }

  if (loading) return <div>Chargement...</div>

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <div>
        <label className="block mb-1">Email</label>
        <input
          type="email"
          value={user.email}
          disabled
          className="w-full p-2 rounded bg-gray-800 text-white cursor-not-allowed"
        />
      </div>

      <div>
        <label className="block mb-1">Prénom</label>
        <input
          type="text"
          value={user.first_name}
          onChange={e => handleChange('first_name', e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>

      <div>
        <label className="block mb-1">Nom</label>
        <input
          type="text"
          value={user.last_name}
          onChange={e => handleChange('last_name', e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>

      {/* CLUBS */}
      <div className="space-y-2">
        <label className="block mb-1 font-bold">Clubs</label>
        {clubs.map(c => {
          const membership = user.memberships.find(m => m.club_id === c.id)
          return (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-32">{c.name}</span>
              <select
                value={membership?.role || ''}
                onChange={e =>
                  handleMembershipChange(c.id, e.target.value as 'club_admin' | 'player' | '')
                }
                className="p-1 rounded bg-gray-800 text-white"
              >
                <option value="">Non lié</option>
                <option value="player">Joueur</option>
                <option value="club_admin">Admin Club</option>
              </select>
            </div>
          )
        })}
      </div>

      {/* TEAMS - filtré par club sélectionné */}
      {selectedClubId && (
        <div className="space-y-2">
          <label className="block mb-1 font-bold">Team (optionnel)</label>
          <select
            value={user.memberships.find(m => m.club_id === selectedClubId)?.team_id || ''}
            onChange={e => handleTeamChange(selectedClubId, e.target.value)}
            className="p-2 rounded bg-gray-800 text-white w-full"
          >
            <option value="">-- Aucune --</option>
            {teams
              .filter(t => t.club_id === selectedClubId)
              .map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          disabled={loading}
        >
          Enregistrer
        </button>
        {onClose && (
          <button
            type="button"
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold"
            onClick={onClose}
          >
            Fermer
          </button>
        )}
      </div>
    </form>
  )
}
