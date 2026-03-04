'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type Club = {
  id: string
  name: string
}

type Membership = {
  id?: string
  club_id: string
  role: 'player' | 'captain'
}

type User = {
  id?: string
  email: string
  role: 'admin' | 'club_admin' | 'player' | 'captain'
  memberships: Membership[]
}

export default function UserFormPage() {
  const router = useRouter()
  const { id } = router.query

  const [user, setUser] = useState<User>({
    email: '',
    role: 'player',
    memberships: []
  })
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)

  // Récupère la liste des clubs pour les memberships
  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('*').order('name')
      if (data) setClubs(data)
    }
    fetchClubs()
  }, [])

  // Récupère l'utilisateur existant
  useEffect(() => {
    if (!id || id === 'new') return
    const fetchUser = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('users').select('*').eq('id', id).single()
      if (error) console.error(error)
      else if (data) {
        const { data: memberships } = await supabase
          .from('club_memberships')
          .select('*')
          .eq('user_id', id)
        setUser({ ...data, memberships: memberships || [] })
      }
      setLoading(false)
    }
    fetchUser()
  }, [id])

  const handleChange = (field: keyof User, value: any) => {
    setUser({ ...user, [field]: value })
  }

  const handleMembershipChange = (club_id: string, role: 'player' | 'captain') => {
    const exists = user.memberships.find(m => m.club_id === club_id)
    if (exists) {
      setUser({
        ...user,
        memberships: user.memberships.map(m =>
          m.club_id === club_id ? { ...m, role } : m
        )
      })
    } else {
      setUser({
        ...user,
        memberships: [...user.memberships, { club_id, role }]
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (id === 'new') {
        const { data: newUser, error: insertError } = await supabase.from('users').insert([
          { email: user.email, role: user.role }
        ]).select().single()
        if (insertError) throw insertError

        for (const m of user.memberships) {
          await supabase.from('club_memberships').insert([{ user_id: newUser.id, ...m }])
        }
      } else {
        await supabase.from('users').update({ email: user.email, role: user.role }).eq('id', id)

        // Mise à jour des memberships : supprime et recrée
        await supabase.from('club_memberships').delete().eq('user_id', id)
        for (const m of user.memberships) {
          await supabase.from('club_memberships').insert([{ user_id: id, ...m }])
        }
      }

      router.push('/dashboard/admin/users')
    } catch (err: any) {
      alert(err.message)
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        {id === 'new' ? 'Créer un utilisateur' : 'Éditer l’utilisateur'}
      </h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label>Email</label>
            <input
              type="email"
              value={user.email}
              onChange={e => handleChange('email', e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label>Rôle</label>
            <select
              value={user.role}
              onChange={e => handleChange('role', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="admin">Admin</option>
              <option value="club_admin">Club Admin</option>
              <option value="player">Player</option>
              <option value="captain">Captain</option>
            </select>
          </div>

          <div>
            <label className="block mb-2">Memberships</label>
            {clubs.map(club => {
              const membership = user.memberships.find(m => m.club_id === club.id)
              return (
                <div key={club.id} className="flex gap-2 items-center mb-1">
                  <span className="w-32">{club.name}</span>
                  <select
                    value={membership?.role || ''}
                    onChange={e => handleMembershipChange(club.id, e.target.value as 'player' | 'captain')}
                    className="p-1 rounded bg-gray-800 border border-gray-700"
                  >
                    <option value="">— Aucun —</option>
                    <option value="player">Player</option>
                    <option value="captain">Captain</option>
                  </select>
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          >
            {id === 'new' ? 'Créer l’utilisateur' : 'Mettre à jour'}
          </button>
        </form>
      )}
    </div>
  )
}
