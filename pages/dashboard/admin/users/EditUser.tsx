'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

export type EditUserProps = {
  userId: string
  onSaved: () => void
  onClose?: () => void // optionnel pour permettre le build partout
}

type ClubMembership = {
  id: string
  club_id: string
  club_name?: string
  role: 'club_admin' | 'user'
}

type UserData = {
  email: string
  first_name?: string
  last_name?: string
  memberships: ClubMembership[]
}

export default function EditUser({ userId, onSaved, onClose }: EditUserProps) {
  const [user, setUser] = useState<UserData>({
    email: '',
    first_name: '',
    last_name: '',
    memberships: [],
  })
  const [clubs, setClubs] = useState<{ id: string; name: string }[]>([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true)
      const { data: u, error: userErr } = await supabase
        .from('users')
        .select('email, first_name, last_name')
        .eq('id', userId)
        .single()
      if (userErr) console.error(userErr)
      else
        setUser((prev) => ({
          ...prev,
          email: u.email,
          first_name: u.first_name || '',
          last_name: u.last_name || '',
        }))

      const { data: memberships, error: memErr } = await supabase
        .from('club_memberships')
        .select('id, club_id, role, club:name')
        .eq('user_id', userId)

      if (memErr) console.error(memErr)
      else {
        const mapped = (memberships || []).map((m: any) => ({
          id: m.id,
          club_id: m.club_id,
          club_name: m.club?.name,
          role: m.role,
        }))
        setUser((prev) => ({ ...prev, memberships: mapped }))
      }

      const { data: clubsData } = await supabase.from('clubs').select('id, name').order('name')
      if (clubsData) setClubs(clubsData)

      setLoading(false)
    }

    fetchUser()
  }, [userId])

  const handleChange = (field: keyof UserData, value: string) => {
    setUser({ ...user, [field]: value })
  }

  const handleMembershipChange = (club_id: string, role: 'club_admin' | 'user' | '') => {
    setUser((prev) => {
      const exists = prev.memberships.find((m) => m.club_id === club_id)
      if (!role) {
        return {
          ...prev,
          memberships: prev.memberships.filter((m) => m.club_id !== club_id),
        }
      }
      if (exists) {
        return {
          ...prev,
          memberships: prev.memberships.map((m) =>
            m.club_id === club_id ? { ...m, role } : m
          ),
        }
      } else {
        return {
          ...prev,
          memberships: [...prev.memberships, { id: '', club_id, role }],
        }
      }
    })
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error: userErr } = await supabase
      .from('users')
      .update({ first_name: user.first_name, last_name: user.last_name })
      .eq('id', userId)
    if (userErr) alert(userErr.message)

    for (const m of user.memberships) {
      if (!m.id) {
        const { error } = await supabase.from('club_memberships').insert([
          { user_id: userId, club_id: m.club_id, role: m.role },
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

    setLoading(false)
    onSaved()
  }

  return (
    <form onSubmit={handleSave} className="space-y-4 max-w-lg">
      {loading && <p>Chargement...</p>}

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
          onChange={(e) => handleChange('first_name', e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>

      <div>
        <label className="block mb-1">Nom</label>
        <input
          type="text"
          value={user.last_name}
          onChange={(e) => handleChange('last_name', e.target.value)}
          className="w-full p-2 rounded bg-gray-800 text-white"
        />
      </div>

      <div className="space-y-2">
        <label className="block mb-1 font-bold">Clubs</label>
        {clubs.map((c) => {
          const membership = user.memberships.find((m) => m.club_id === c.id)
          return (
            <div key={c.id} className="flex items-center gap-2">
              <span className="w-32">{c.name}</span>
              <select
                value={membership?.role || ''}
                onChange={(e) =>
                  handleMembershipChange(c.id, e.target.value as 'club_admin' | 'user' | '')
                }
                className="p-1 rounded bg-gray-800 text-white"
              >
                <option value="">Non lié</option>
                <option value="user">Utilisateur</option>
                <option value="club_admin">Admin Club</option>
              </select>
            </div>
          )
        })}
      </div>

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
