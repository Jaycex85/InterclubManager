'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabaseClient'

type TeamFormProps = {
  teamId: string
  onSaved: () => void
  onClose: () => void
}

type User = { id: string; email: string; first_name?: string; last_name?: string }

export default function TeamForm({ teamId, onSaved, onClose }: TeamFormProps) {
  const [name, setName] = useState('')
  const [clubId, setClubId] = useState('')
  const [category, setCategory] = useState('')
  const [captainId, setCaptainId] = useState<string | null>(null)

  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  // Fetch users to populate the captain select
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('last_name, first_name')

    if (!error && data) setUsers(data)
  }

  useEffect(() => {
    fetchUsers()
    // tu peux aussi fetch team data ici si nécessaire
    setLoading(false)
  }, [teamId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // save/update team in supabase
    // ...
    onSaved()
  }

  if (loading) return <div>Chargement...</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block mb-1">Nom de l'équipe</label>
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block mb-1">Catégorie</label>
        <input
          type="text"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        />
      </div>

      <div>
        <label className="block mb-1">Capitaine</label>
        <select
          value={captainId || ''}
          onChange={e => setCaptainId(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        >
          <option value="">-- Aucun --</option>
          {users.map(u => {
            const fullName = [u.last_name, u.first_name].filter(Boolean).join(' ').trim()
            const label = fullName ? `${fullName} - ${u.email}` : u.email
            return (
              <option key={u.id} value={u.id}>
                {label}
              </option>
            )
          })}
        </select>
      </div>

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
          Enregistrer
        </button>
      </div>
    </form>
  )
}
