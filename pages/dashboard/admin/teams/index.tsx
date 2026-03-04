'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import EditTeam from './EditTeam'

type Team = {
  id: string
  name: string
  club_name?: string
  category?: string
  captain_email?: string
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const fetchTeams = async () => {
    setLoading(true)

    const { data } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        category,
        club:club_id(name),
        captain:captain_id(email)
      `)
      .order('name')

    if (data) {
      setTeams(
        data.map((t: any) => ({
          id: t.id,
          name: t.name,
          category: t.category,
          club_name: t.club?.name || '',
          captain_email: t.captain?.email || '',
        }))
      )
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchTeams()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette équipe ?')) return
    await supabase.from('teams').delete().eq('id', id)
    fetchTeams()
  }

  if (selectedTeamId) {
    return (
      <div className="bg-gray-900 text-gray-100 p-6 rounded">
        <button
          onClick={() => setSelectedTeamId(null)}
          className="mb-6 text-yellow-400 hover:underline"
        >
          ← Retour à la liste
        </button>

        <EditTeam
          teamId={selectedTeamId}
          onClose={() => setSelectedTeamId(null)}
          onSaved={fetchTeams}
        />
      </div>
    )
  }

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Gestion des Équipes</h1>
        <button
          onClick={() => setSelectedTeamId('new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter une équipe
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {teams.map(team => (
            <li key={team.id} className="p-4 bg-gray-800 rounded shadow flex justify-between items-center">
              <div>
                <p className="font-bold text-lg">{team.name}</p>
                <p className="text-gray-400 text-sm">
                  Club: {team.club_name} {team.category ? `- ${team.category}` : ''}
                </p>
                {team.captain_email && (
                  <p className="text-gray-400 text-sm">Capitaine: {team.captain_email}</p>
                )}
              </div>

              <div className="flex gap-2">
                <button
                  className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
                  onClick={() => setSelectedTeamId(team.id)}
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
