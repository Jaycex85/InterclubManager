'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

export type UserProps = {
  userId: string
  onSaved: () => void
}

type Club = {
  id: string
  name: string
}

type Membership = {
  id: string
  club_id: string
  role: 'club_admin' | 'member'
  club_name?: string
}

export default function EditUser({ userId, onSaved }: UserProps) {
  const [email, setEmail] = useState('')
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [clubs, setClubs] = useState<Club[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)

  // Récupère le user et ses memberships
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // User
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single()

      if (userError) console.error(userError)
      else if (userData) {
        setEmail(userData.email)
        setFirstName(userData.first_name || '')
        setLastName(userData.last_name || '')
      }

      // Clubs pour dropdown
      const { data: clubData, error: clubError } = await supabase
        .from('clubs')
        .select('*')
        .order('name')

      if (clubError) console.error(clubError)
      else if (clubData) setClubs(clubData)

      // Memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('club_memberships')
        .select(`*, club:club_id(name)`)
        .eq('user_id', userId)

      if (membershipError) console.error(membershipError)
      else if (membershipData) {
        setMemberships(
          membershipData.map((m: any) => ({
            id: m.id,
            club_id: m.club_id,
            role: m.role,
            club_name: m.club?.name,
          }))
        )
      }
      setLoading(false)
    }

    fetchData()
  }, [userId])

  const handleMembershipChange = (clubId: string, role: 'club_admin' | 'member' | '') => {
    if (role === '') {
      // Supprime l’adhésion
      setMemberships(prev => prev.filter(m => m.club_id !== clubId))
    } else {
      setMemberships(prev => {
        const existing = prev.find(m => m.club_id === clubId)
        if (existing) return prev.map(m => (m.club_id === clubId ? { ...m, role } : m))
        return [...prev, { id: '', club_id: clubId, role }]
      })
    }
  }

  const handleSave = async () => {
    setLoading(true)

    // Update user info
    const { error: userError } = await supabase
      .from('users')
      .update({ email, first_name: firstName, last_name: lastName })
      .eq('id', userId)
    if (userError) alert(userError.message)

    // Update memberships
    for (const m of memberships) {
      if (!m.id) {
        const { error } = await supabase.from('club_memberships').insert([
          { user_id: userId, club_id: m.club_id, role: m.role }
        ])
        if (error) console.error(error)
      } else {
        const { error } = await supabase
          .from('club_memberships')
          .update({ role: m.role })
          .eq('id', m.id)
        if (error) console.error(error)
      }
    }

    // Supprime les memberships non sélectionnés
    const removed = memberships.map(m => m.club_id)
    const { error: delError } = await supabase
      .from('club_memberships')
      .delete()
      .eq('user_id', userId)
      .not('club_id', 'in', `(${removed.join(',')})`)

    if (delError) console.error(delError)

    setLoading(false)
    onSaved()
  }

  return (
    <div className="space-y-4">
      {loading && <p>Chargement...</p>}

      <div>
        <label className="block mb-1">Email</label>
        <input
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1">Prénom</label>
          <input
            type="text"
            value={firstName}
            onChange={e => setFirstName(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        </div>
        <div>
          <label className="block mb-1">Nom</label>
          <input
            type="text"
            value={lastName}
            onChange={e => setLastName(e.target.value)}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1 font-bold">Clubs</label>
        <div className="space-y-2">
          {clubs.map(club => {
            const membership = memberships.find(m => m.club_id === club.id)
            return (
              <div key={club.id} className="flex items-center gap-2">
                <span className="flex-1">{club.name}</span>
                <select
                  value={membership?.role || ''}
                  onChange={e => handleMembershipChange(club.id, e.target.value as any)}
                  className="p-1 rounded bg-gray-700 text-white"
                >
                  <option value="">Aucun</option>
                  <option value="member">Membre</option>
                  <option value="club_admin">Admin club</option>
                </select>
              </div>
            )
          })}
        </div>
      </div>

      <button
        onClick={handleSave}
        className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        disabled={loading}
      >
        Enregistrer
      </button>
    </div>
  )
}
