'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import dynamic from 'next/dynamic'

const EditTeam = dynamic(() => import('./EditTeam'), { ssr: false })

type Team = { id: string; name: string; club_name?: string; category?: string; captain_email?: string }

function TeamItem({ team, isOpen, onToggle, onSaved }: { team: Team; isOpen: boolean; onToggle: () => void; onSaved: () => void }) {
  const [maxHeight, setMaxHeight] = useState('0px')
  const contentRef = (el: HTMLDivElement | null) => {
    if (el) setMaxHeight(`${el.scrollHeight}px`)
  }

  return (
    <li className="p-4 bg-gray-800 rounded shadow flex flex-col overflow-hidden">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-lg">{team.name}</p>
          <p className="text-gray-400 text-sm">
            Club: {team.club_name} {team.category ? `- ${team.category}` : ''}
          </p>
          {team.captain_email && <p className="text-gray-400 text-sm">Capitaine: {team.captain_email}</p>}
        </div>
        <div className="flex gap-2">
          <button
            className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
            onClick={onToggle}
          >
            Voir / Éditer
          </button>
        </div>
      </div>

      <div className="transition-all duration-500 overflow-hidden" style={{ maxHeight: isOpen ? maxHeight : '0px' }}>
        {isOpen && (
          <div ref={contentRef} className="mt-4">
            <EditTeam
              teamId={team.id}
              onSaved={onSaved}
              onClose={onToggle}
            />
          </div>
        )}
      </div>
    </li>
  )
}

export default function AdminTeamsPage() {
  const [teams, setTeams] = useState<Team[]>([])
  const [loading, setLoading] = useState(false)
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)

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

  useEffect(() => {
    fetchTeams()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Gestion des Équipes</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {teams.map(team => (
            <TeamItem
              key={team.id}
              team={team}
              isOpen={openTeamId === team.id}
              onToggle={() => setOpenTeamId(openTeamId === team.id ? null : team.id)}
              onSaved={fetchTeams}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
