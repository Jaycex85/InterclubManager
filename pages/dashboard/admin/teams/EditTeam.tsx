'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type TeamFormProps = {
  teamId: string
  onSaved: () => void
  onClose: () => void
}

type User = { id: string; email: string; first_name?: string; last_name?: string }
type Club = { id: string; name: string }

export default function TeamForm({ teamId, onSaved, onClose }: TeamFormProps) {

  const isNew = teamId === 'new'

  const [name, setName] = useState('')
  const [clubId, setClubId] = useState('')
  const [category, setCategory] = useState('')
  const [gender, setGender] = useState('')
  const [captainId, setCaptainId] = useState<string | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [clubs, setClubs] = useState<Club[]>([])

  const [loading, setLoading] = useState(true)

  /** FETCH USERS */
  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('*')
      .order('last_name')

    if (data) setUsers(data)
  }

  /** FETCH CLUBS */
  const fetchClubs = async () => {
    const { data } = await supabase
      .from('clubs')
      .select('id, name')
      .order('name')

    if (data) setClubs(data)
  }

  /** FETCH TEAM (edit mode only) */
  const fetchTeam = async () => {

    if (isNew) return

    const { data } = await supabase
      .from('teams')
      .select('*')
      .eq('id', teamId)
      .single()

    if (data) {
      setName(data.name || '')
      setCategory(data.category || '')
      setGender(data.gender || '')
      setClubId(data.club_id || '')
      setCaptainId(data.captain_id || null)
    }
  }

  useEffect(() => {

    setLoading(true)

    Promise.all([
      fetchUsers(),
      fetchClubs(),
      fetchTeam()
    ]).finally(() => setLoading(false))

  }, [teamId])

  /** SAVE TEAM */
  const handleSubmit = async (e: React.FormEvent) => {

    e.preventDefault()

    const payload = {
      name,
      club_id: clubId || null,
      category,
      gender,
      captain_id: captainId || null
    }

    if (isNew) {

      await supabase
        .from('teams')
        .insert([payload])

    } else {

      await supabase
        .from('teams')
        .update(payload)
        .eq('id', teamId)

    }

    onSaved()
    onClose()
  }

  if (loading) return <div>Chargement...</div>

  return (

    <form onSubmit={handleSubmit} className="space-y-4">

      <h2 className="text-xl font-bold text-yellow-400">
        {isNew ? 'Créer une team' : 'Modifier la team'}
      </h2>

      {/* NAME */}

      <div>
        <label className="block mb-1">Nom de l'équipe</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
          required
        />
      </div>

      {/* CLUB */}

      <div>
        <label className="block mb-1">Club</label>
        <select
          value={clubId}
          onChange={e => setClubId(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
          required
        >
          <option value="">-- Sélectionner un club --</option>

          {clubs.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}

        </select>
      </div>

      {/* CATEGORY */}

      <div>
        <label className="block mb-1">Catégorie</label>
        <input
          type="text"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        />
      </div>

      {/* GENDER */}

      <div>
        <label className="block mb-1">Genre</label>
        <select
          value={gender}
          onChange={e => setGender(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        >
          <option value="">-- Sélectionner --</option>
          <option value="men">Hommes</option>
          <option value="women">Femmes</option>
          <option value="mixed">Mixte</option>
        </select>
      </div>

      {/* CAPTAIN */}

      <div>
        <label className="block mb-1">Capitaine</label>

        <select
          value={captainId || ''}
          onChange={e => setCaptainId(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        >

          <option value="">-- Aucun --</option>

          {users.map(u => {

            const fullName =
              [u.last_name, u.first_name]
                .filter(Boolean)
                .join(' ')
                .trim()

            const label =
              fullName
                ? `${fullName} - ${u.email}`
                : u.email

            return (
              <option key={u.id} value={u.id}>
                {label}
              </option>
            )

          })}

        </select>

      </div>

      {/* BUTTONS */}

      <div className="flex justify-end space-x-2">

        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
        >
          Annuler
        </button>

        <button
          type="submit"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-bold"
        >
          {isNew ? 'Créer' : 'Enregistrer'}
        </button>

      </div>

    </form>

  )
}
