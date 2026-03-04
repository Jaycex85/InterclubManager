'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type Team = {
  id?: string
  name: string
  club_id: string
  category?: string
  captain?: string
}

type Club = {
  id: string
  name: string
}

export default function TeamFormPage({ params }: { params: { id: string } }) {
  const [team, setTeam] = useState<Team>({ name: '', club_id: '', category: '', captain: '' })
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const isNew = params.id === 'new'

  // Vérifie admin
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) router.push('/auth')

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', data.user.id)
        .single()
      if (profile?.role !== 'admin') router.push('/auth')
    }
    checkUser()
  }, [router])

  // Récupère clubs pour dropdown
  useEffect(() => {
    const fetchClubs = async () => {
      const { data } = await supabase.from('clubs').select('id, name').order('name')
      if (data) setClubs(data)
    }
    fetchClubs()
  }, [])

  // Si édition, fetch équipe existante
  useEffect(() => {
    if (!isNew) {
      const fetchTeam = async () => {
        const { data } = await supabase.from('teams').select('*').eq('id', params.id).single()
        if (data) setTeam(data)
      }
      fetchTeam()
    }
  }, [params.id, isNew])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setTeam({ ...team, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    if (isNew) {
      const { error } = await supabase.from('teams').insert([team])
      if (error) alert(error.message)
      else router.push('/dashboard/admin/teams')
    } else {
      const { error } = await supabase.from('teams').update(team).eq('id', params.id)
      if (error) alert(error.message)
      else router.push('/dashboard/admin/teams')
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        {isNew ? 'Nouvelle Équipe' : 'Éditer Équipe'}
      </h1>

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block mb-1">Nom de l’équipe</label>
          <input
            type="text"
            name="name"
            value={team.name}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
            required
          />
        </div>

        <div>
          <label className="block mb-1">Club</label>
          <select
            name="club_id"
            value={team.club_id}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
            required
          >
            <option value="">Sélectionner un club</option>
            {clubs.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block mb-1">Catégorie</label>
          <input
            type="text"
            name="category"
            value={team.category || ''}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        </div>

        <div>
          <label className="block mb-1">Capitaine</label>
          <input
            type="text"
            name="captain"
            value={team.captain || ''}
            onChange={handleChange}
            className="w-full p-2 rounded bg-gray-800 text-white"
          />
        </div>

        <button
          type="submit"
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          disabled={loading}
        >
          {isNew ? 'Créer' : 'Mettre à jour'}
        </button>
      </form>
    </div>
  )
}
