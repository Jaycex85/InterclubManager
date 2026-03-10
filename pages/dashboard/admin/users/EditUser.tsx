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
  team_name?: string | null
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

  /** FETCH DATA */
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

      // Clubs
      const { data: clubsData } = await supabase.from('clubs').select('id, name').order('name')
      if (clubsData) setClubs(clubsData)

      // Teams
      const { data: teamsData } = await supabase.from('teams').select('id, name, club_id').order('name')
      if (teamsData) setTeams(teamsData)

      // Memberships
      const { data: memberships, error: memErr } = await supabase
        .from('club_memberships')
        .select('id, club_id, role, team_id, team:team_id(name)')
        .eq('user_id', userId)
      if (!memErr && memberships) {
        const mapped: ClubMembership[] = memberships.map((m: any) => ({
          id: m.id,
          club_id: m.club_id,
          club_name: m.club?.name || '',
          role: m.role,
          team_id: m.team_id || null,
          team_name: m.team?.name || null,
        }))
        setUser(prev => ({ ...prev, memberships: mapped }))
        if (mapped.length > 0) setSelectedClubId(mapped[0].club_id)
      }

      setLoading(false)
    }

    fetchData()
  }, [userId])

  /** HANDLERS */
  const handleChange = (field: keyof UserData, value: string) => {
    setUser(prev => ({ ...prev, [field]: value }))
  }

  const handleMembershipChange = (club_id: string, role: 'club_admin' | 'player') => {
    setSelectedClubId(club_id)
    setUser(prev => {
      const exists = prev.memberships.find(m => m.club_id === club_id)
      if (exists) {
        return {
          ...prev,
          memberships: prev.memberships.map(m =>
            m.club_id === club_id ? { ...m, role } : m
          ),
        }
      } else {
        return {
          ...prev,
          memberships: [...prev.memberships, { id: '', club_id, role, team_id: null, team_name: null }],
        }
      }
    })
  }

  const handleTeamChange = (club_id: string, team_id: string) => {
    setUser(prev => ({
      ...prev,
      memberships: prev.memberships.map(m =>
        m.club_id === club_id ? { ...m, team_id, team_name: teams.find(t => t.id === team_id)?.name } : m
      ),
    }))
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    // Update user
    const { error: userErr } = await supabase
      .from('users')
      .update({ first_name: user.first_name, last_name: user.last_name })
      .eq('id', userId)
    if (userErr) alert(userErr.message)

    // Update memberships
    for (const m of user.memberships) {
      if (!m.id) {
        const { error } = await supabase.from('club_memberships').insert([
          { user_id: userId, club_id: m.club_id, role: m.role, team_id: m.team_id || null },
        ])
        if (error) console.error(error)
      } else {
        const { error } = await supabase
          .from('club_memberships')
          .update({ role: m.role, team_id: m.team_id || null })
          .eq('id', m.id)
        if (error) console.error(error)
      }
    }

    setLoading(false)
    onSaved()
  }

  if (loading) return <p>Chargement...</p>

  const currentMembership = user.memberships.find(m => m.club_id === selectedClubId)

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      <div>
        <label className="block mb-1">Email</label>
        <input type="email" value={user.email} disabled className="w-full p-2 rounded bg-gray-800 text-white cursor-not-allowed" />
      </div>

      <div>
        <label className="block mb-1">Prénom</label>
        <input type="text" value={user.first_name} onChange={e => handleChange('first_name', e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white" />
      </div>

      <div>
        <label className="block mb-1">Nom</label>
        <input type="text" value={user.last_name} onChange={e => handleChange('last_name', e.target.value)} className="w-full p-2 rounded bg-gray-800 text-white" />
      </div>

      {/* CLUB SELECT */}
      <div>
        <label className="block mb-1 font-bold">Club</label>
        <select
          value={selectedClubId || ''}
          onChange={e => setSelectedClubId(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        >
          <option value="">-- Choisir un club --</option>
          {clubs.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* ROLE SELECT */}
      {selectedClubId && (
        <div>
          <label className="block mb-1 font-bold">Rôle</label>
          <select
            value={currentMembership?.role || 'player'}
            onChange={e => handleMembershipChange(selectedClubId, e.target.value as 'club_admin' | 'player')}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            <option value="player">Joueur</option>
            <option value="club_admin">Admin Club</option>
          </select>
        </div>
      )}

      {/* TEAM SELECT */}
      {selectedClubId && (
        <div>
          <label className="block mb-1 font-bold">Team (optionnelle)</label>
          <select
            value={currentMembership?.team_id || ''}
            onChange={e => handleTeamChange(selectedClubId, e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          >
            <option value="">-- Aucune --</option>
            {teams
              .filter(t => t.club_id === selectedClubId)
              .map(t => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
          </select>
        </div>
      )}

      <div className="flex gap-2">
        <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold" disabled={loading}>
          Enregistrer
        </button>
        {onClose && (
          <button type="button" className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded font-bold" onClick={onClose}>
            Fermer
          </button>
        )}
      </div>
    </form>
  )
}
