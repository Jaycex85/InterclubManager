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
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const fetchTeams = async () => {
    setLoading(true)
    const { data } = await supabase
      .from('teams')
      .select(`id, name, category, club:club_id(name), captain:captain_id(email)`)
      .order('name')
    if (data) {
      setTeams(data.map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        club_name: t.club?.name || '',
        captain_email: t.captain?.email || '',
      })))
    }
    setLoading(false)
  }

  useEffect(() => { fetchTeams() }, [])

  const toggleTeamForm = (teamId: string) => {
    setOpenTeamId(prev => (prev === teamId ? null : teamId))
  }

  useEffect(() => {
    if (openTeamId && containerRefs.current[openTeamId]) {
      const el = containerRefs.current[openTeamId]
      el!.style.maxHeight = el!.scrollHeight + 'px'
    }
  }, [openTeamId])

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Gestion des Équipes</h1>

      {loading ? <p>Chargement...</p> : (
        <ul className="space-y-4">
          {teams.map(team => (
            <li key={team.id} className="bg-gray-800 rounded shadow overflow-hidden">
              <button
                className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 font-bold flex justify-between items-center"
                onClick={() => toggleTeamForm(team.id)}
              >
                <span>{team.name} {team.club_name ? `- ${team.club_name}` : ''} {team.category ? `- ${team.category}` : ''}</span>
                <span className={`ml-2 transform transition-transform duration-300 ${openTeamId === team.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              <div
                ref={el => (containerRefs.current[team.id] = el)}
                style={{ overflow: 'hidden', maxHeight: openTeamId === team.id ? undefined : 0, transition: 'max-height 0.35s ease' }}
              >
                {openTeamId === team.id && (
                  <div className="p-4 bg-gray-700">
                    <EditTeam
                      teamId={team.id}
                      onSaved={() => { fetchTeams(); setOpenTeamId(null) }}
                      onClose={() => setOpenTeamId(null)}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
