'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type Team = {
  id: string
  name: string
  club_id: string
  club_name?: string
  category?: string
  captain?: string
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Vérifie que l'utilisateur est admin
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/auth')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', data.user.id)
        .single()
      if (profile?.role !== 'admin') router.push('/auth')
    }
    checkUser()
  }, [router])

  // Récupère la liste des équipes avec nom du club
  const fetchTeams = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('teams')
      .select('id, name, club_id, category, captain, club:club_id(name)')
      .order('name')

    if (error) console.error('Error fetching teams:', error)
    else
      setTeams(
        data.map((t: any) => ({
          id: t.id,
          name: t.name,
          club_id: t.club_id,
          club_name: t.club?.name || '',
          category: t.category,
          captain: t.captain,
        }))
      )

    setLoading(false)
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cette équipe ?')) return
    const { error } = await supabase.from('teams').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchTeams()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Gestion des Équipes</h1>
        <button
          onClick={() => router.push('/dashboard/admin/teams/new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter une équipe
        </button>
      </div>

      {loading ? (
        <p>Chargement des équipes...</p>
      ) : teams.length === 0 ? (
        <p>Aucune équipe pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {teams.map((team) => (
            <li
              key={team.id}
              className="p-4 bg-gray-800 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-lg">{team.name}</p>
                <p className="text-gray-400 text-sm">
                  Club: {team.club_name} {team.category ? `- ${team.category}` : ''}
                </p>
                {team.captain && <p className="text-gray-400 text-sm">Capitaine: {team.captain}</p>}
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
                  onClick={() => router.push(`/dashboard/admin/teams/${team.id}`)}
                >
                  Voir / Éditer
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  onClick={() => handleDelete(team.id)}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
