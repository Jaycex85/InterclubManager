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

  // slide-down hook
  const useSlideDown = (isOpen: boolean) => {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState('0px')

    useEffect(() => {
      if (ref.current) {
        setTimeout(() => {
          setHeight(isOpen ? `${ref.current!.scrollHeight}px` : '0px')
        }, 0)
      }
    }, [isOpen, ref.current?.scrollHeight])

    return { ref, style: { maxHeight: height, overflow: 'hidden', transition: 'max-height 0.35s ease' } }
  }

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

  const toggleTeam = (id: string) => {
    setOpenTeamId(prev => (prev === id ? null : id))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer cette équipe ?')) return
    await supabase.from('teams').delete().eq('id', id)
    fetchTeams()
  }

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Gestion des Équipes</h1>
        <button
          onClick={() => setOpenTeamId('new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter une équipe
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {teams.map(team => {
            const { ref, style } = useSlideDown(openTeamId === team.id)
            return (
              <li key={team.id} className="bg-gray-800 rounded shadow overflow-hidden">
                <div
                  className="flex justify-between items-center p-4 bg-gray-700 hover:bg-gray-600 cursor-pointer"
                  onClick={() => toggleTeam(team.id)}
                >
                  <div>
                    <p className="font-bold text-lg">{team.name}</p>
                    <p className="text-gray-400 text-sm">
                      Club: {team.club_name} {team.category ? `- ${team.category}` : ''}
                    </p>
                    {team.captain_email && (
                      <p className="text-gray-400 text-sm">Capitaine: {team.captain_email}</p>
                    )}
                  </div>
                  <span
                    className={`ml-2 transform transition-transform duration-300 ${
                      openTeamId === team.id ? 'rotate-180' : ''
                    }`}
                  >
                    ▼
                  </span>
                </div>

                <div ref={ref} style={style} className="p-4 bg-gray-600">
                  {openTeamId === team.id && (
                    <EditTeam
                      teamId={team.id}
                      onSaved={fetchTeams}
                      onClose={() => setOpenTeamId(null)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
