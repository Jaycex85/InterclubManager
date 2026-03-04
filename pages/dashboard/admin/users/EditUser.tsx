'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'

type Club = {
  id: string
  name: string
}

type ClubMembership = {
  id?: string
  club_id: string
  role: 'club_admin' | 'player'
}

type UserForm = {
  id?: string
  email: string
  first_name: string
  last_name: string
  memberships: ClubMembership[]
}

type EditUserProps = {
  userId?: string // si undefined => création
}

export default function EditUser({ userId }: EditUserProps) {
  const isNew = !userId

  const [user, setUser] = useState<UserForm>({
    email: '',
    first_name: '',
    last_name: '',
    memberships: [],
  })

  const [allClubs, setAllClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)

  // Récupérer tous les clubs pour dropdown
  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('id, name').order('name')
      if (data) setAllClubs(data)
    }
    fetchClubs()
  }, [])

  // Récupérer l'utilisateur existant et ses memberships
  useEffect(() => {
    if (!userId) return

    const fetchUser = async () => {
      setLoading(true)
      const { data: u } = await supabase.from('users')
        .select('id, email, first_name, last_name')
        .eq('id', userId)
        .single()
      if (!u) return

      const { data: memberships } = await supabase.from('club_memberships')
        .select('id, club_id, role')
        .eq('user_id', userId)

      setUser({
        ...u,
        memberships: memberships || [],
      })
      setLoading(false)
    }

    fetchUser()
  }, [userId])

  const handleChangeField = (field: keyof UserForm, value: string) => {
    setUser(prev => ({ ...prev, [field]: value }))
  }

  const handleMembershipChange = (index: number, field: keyof ClubMembership, value: string) => {
    setUser(prev => {
      const memberships = [...prev.memberships]
      memberships[index] = { ...memberships[index], [field]: value }
      return { ...prev, memberships }
    })
  }

  const addMembership = () => {
    setUser(prev => ({
      ...prev,
      memberships: [...prev.memberships, { club_id: '', role: 'player' }],
    }))
  }

  const removeMembership = (index: number) => {
    setUser(prev => {
      const memberships = [...prev.memberships]
      memberships.splice(index, 1)
      return { ...prev, memberships }
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    let savedUserId = user.id

    // Création ou update de l'utilisateur
    if (isNew) {
      const { data, error } = await supabase.from('users')
        .insert({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        })
        .select('id')
        .single()
      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }
      savedUserId = data.id
    } else if (user.id) {
      const { error } = await supabase.from('users')
        .update({
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
        })
        .eq('id', user.id)
      if (error) {
        alert(error.message)
        setLoading(false)
        return
      }
    }

    // Gérer les club_memberships
    if (savedUserId) {
      // Supprime les anciennes memberships
      await supabase.from('club_memberships')
        .delete()
        .eq('user_id', savedUserId)

      // Insert les nouvelles memberships
      const toInsert = user.memberships
        .filter(m => m.club_id)
        .map(m => ({ ...m, user_id: savedUserId }))
      if (toInsert.length > 0) {
        const { error } = await supabase.from('club_memberships').insert(toInsert)
        if (error) alert(error.message)
      }
    }

    alert('Utilisateur sauvegardé avec succès !')
    setLoading(false)
  }

  return (
    <div className="bg-gray-800 p-4 rounded shadow mt-4">
      {loading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Prénom</label>
              <input
                type="text"
                value={user.first_name}
                onChange={e => handleChangeField('first_name', e.target.value)}
                className="w-full p-2 rounded bg-gray-700"
                required
              />
            </div>
            <div>
              <label className="block mb-1">Nom</label>
              <input
                type="text"
                value={user.last_name}
                onChange={e => handleChangeField('last_name', e.target.value)}
                className="w-full p-2 rounded bg-gray-700"
                required
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              onChange={e => handleChangeField('email', e.target.value)}
              className="w-full p-2 rounded bg-gray-700"
              required
            />
          </div>

          <div>
            <label className="block mb-2 font-bold">Clubs et rôles</label>
            {user.memberships.map((m, i) => (
              <div key={i} className="flex gap-2 mb-2">
                <select
                  value={m.club_id}
                  onChange={e => handleMembershipChange(i, 'club_id', e.target.value)}
                  className="p-2 rounded bg-gray-700 flex-1"
                  required
                >
                  <option value="">Sélectionner un club</option>
                  {allClubs.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>

                <select
                  value={m.role}
                  onChange={e => handleMembershipChange(i, 'role', e.target.value)}
                  className="p-2 rounded bg-gray-700 w-40"
                  required
                >
                  <option value="player">Utilisateur</option>
                  <option value="club_admin">Admin Club</option>
                </select>

                <button
                  type="button"
                  className="bg-red-600 px-2 rounded text-white"
                  onClick={() => removeMembership(i)}
                >
                  ✕
                </button>
              </div>
            ))}

            <button
              type="button"
              className="bg-green-600 px-3 py-1 rounded text-white mt-2"
              onClick={addMembership}
            >
              Ajouter un club
            </button>
          </div>

          <button
            type="submit"
            className="bg-yellow-500 px-4 py-2 rounded font-bold"
          >
            {isNew ? 'Créer utilisateur' : 'Mettre à jour'}
          </button>
        </form>
      )}
    </div>
  )
}
