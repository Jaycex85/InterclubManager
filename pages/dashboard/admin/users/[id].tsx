'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type Club = {
  id: string
  name: string
}

type UserMembership = {
  club_id: string
  role: 'club_admin' | 'member'
}

type User = {
  id?: string
  email: string
  auth_id?: string
  memberships: UserMembership[]
}

export default function UserFormPage() {
  const router = useRouter()
  const { id } = router.query

  const [user, setUser] = useState<User>({
    email: '',
    memberships: []
  })

  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)

  // Récupérer la liste des clubs
  useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase.from('clubs').select('id,name').order('name')
      if (error) console.error(error)
      else if (data) setClubs(data)
    }
    fetchClubs()
  }, [])

  // Récupérer l'utilisateur si id !== "new"
  useEffect(() => {
    if (!id || id === 'new') return

    const fetchUser = async () => {
      setLoading(true)
      const { data: userData, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', id)
        .single()
      if (error) console.error(error)
      else if (userData) {
        // Récupérer les memberships
        const { data: memberships } = await supabase
          .from('club_memberships')
          .select('club_id, role')
          .eq('user_id', id)
        setUser({
          ...userData,
          memberships: memberships || []
        })
      }
      setLoading(false)
    }

    fetchUser()
  }, [id])

  // Ajouter / mettre à jour un membership
  const handleMembershipChange = (clubId: string, role: 'club_admin' | 'member' | '') => {
    setUser(prev => {
      const existing = prev.memberships.find(m => m.club_id === clubId)
      if (!existing && role) {
        return { ...prev, memberships: [...prev.memberships, { club_id: clubId, role }] }
      }
      if (existing) {
        if (!role) {
          return { ...prev, memberships: prev.memberships.filter(m => m.club_id !== clubId) }
        } else {
          return {
            ...prev,
            memberships: prev.memberships.map(m =>
              m.club_id === clubId ? { ...m, role } : m
            )
          }
        }
      }
      return prev
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let userId = id

      if (id === 'new') {
        // Créer un nouvel utilisateur
        const { data, error } = await supabase.from('users').insert([{ email: user.email }]).select('id').single()
        if (error) throw error
        userId = data.id
      } else {
        // Mettre à jour email uniquement
        const { error } = await supabase.from('users').update({ email: user.email }).eq('id', userId)
        if (error) throw error
      }

      // Mettre à jour les memberships
      // Supprimer tous les anciens et insérer les nouveaux
      await supabase.from('club_memberships').delete().eq('user_id', userId)
      if (user.memberships.length > 0) {
        const membershipsToInsert = user.memberships.map(m => ({ ...m, user_id: userId }))
        await supabase.from('club_memberships').insert(membershipsToInsert)
      }

      router.push('/dashboard/admin/users')
    } catch (err: any) {
      alert(err.message)
    } finally {
      setLoading(false)
    }
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
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              onChange={e => setUser({ ...user, email: e.target.value })}
              required
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <p className="mb-2 font-bold">Clubs associés</p>
            {clubs.map(club => {
              const membership = user.memberships.find(m => m.club_id === club.id)
              return (
                <div key={club.id} className="flex items-center gap-4 mb-2">
                  <span className="w-40">{club.name}</span>
                  <select
                    value={membership?.role || ''}
                    onChange={e => handleMembershipChange(club.id, e.target.value as 'club_admin' | 'member' | '')}
                    className="p-2 rounded bg-gray-800 border border-gray-700"
                  >
                    <option value="">Aucun</option>
                    <option value="member">Membre</option>
                    <option value="club_admin">Admin club</option>
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
