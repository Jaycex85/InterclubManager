'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type Team = {
  id?: string
  name: string
  club_id: string
  category?: string
  captain_id?: string
}

type Club = {
  id: string
  name: string
}

type User = {
  id: string
  email: string
}

type Props = {
  teamId: string | null
  onClose: () => void
  onSaved: () => void
}

export default function EditTeam({ teamId, onClose, onSaved }: Props) {
  const isNew = teamId === 'new'

  const [team, setTeam] = useState<Team>({
    name: '',
    club_id: '',
    category: '',
    captain_id: '',
  })

  const [clubs, setClubs] = useState<Club[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)

  // Charger clubs et users
  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase
        .from('clubs')
        .select('id, name')
        .order('name')
      if (data) setClubs(data)
    }

    const fetchUsers = async () => {
      const { data } = await supabase
        .from('users')
        .select('id, email')
        .order('email')
      if (data) setUsers(data)
    }

    fetchClubs()
    fetchUsers()
  }, [])

  // Charger team si édition
  useEffect(() => {
    if (!teamId || teamId === 'new') return

    const fetchTeam = async () => {
      setLoading(true)
      const { data } = await supabase
        .from('teams')
        .select('*')
        .eq('id', teamId)
        .single()

      if (data) setTeam(data)
      setLoading(false)
    }

    fetchTeam()
  }, [teamId])

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    setTeam({ ...team, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isNew) {
      await supabase.from('teams').insert([team])
    } else {
      await supabase.from('teams').update(team).eq('id', teamId)
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="mt-6 p-6 bg-gray-800 rounded shadow">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">
        {isNew ? 'Nouvelle Équipe' : 'Éditer Équipe'}
      </h2>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          name="name"
          placeholder="Nom de l’équipe"
          value={team.name}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          required
        />

        <select
          name="club_id"
          value={team.club_id}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          required
        >
          <option value="">Sélectionner un club</option>
          {clubs.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          type="text"
          name="category"
          placeholder="Catégorie"
          value={team.category || ''}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
        />

        <select
          name="captain_id"
          value={team.captain_id || ''}
          onChange={handleChange}
          className="w-full p-2 rounded bg-gray-900 border border-gray-700"
        >
          <option value="">Sélectionner un capitaine</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.email}
            </option>
          ))}
        </select>

        <div className="flex gap-3">
          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
            disabled={loading}
          >
            {isNew ? 'Créer' : 'Mettre à jour'}
          </button>

          <button
            type="button"
            onClick={onClose}
            className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
          >
            Annuler
          </button>
        </div>
      </form>
    </div>
  )
}
