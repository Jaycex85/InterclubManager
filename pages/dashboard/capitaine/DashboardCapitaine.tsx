'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'

const MatchForm = dynamic(() => import('./matches/EditMatch'), { ssr: false })

type Team = {
  id: string
  name: string
}

type Match = {
  id: string
  team_id: string
  opponent: string
  match_date: string
  match_time: string
  location_type: string
  clubadress: string
  composition_validated: boolean
}

export default function DashboardCapitaine() {

  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)
  const [openModal, setOpenModal] = useState<{ matchId: string } | null>(null)

  const fetchData = async () => {

    const { data: { session } } = await supabase.auth.getSession()

    if (!session?.user) return

    const { data: userData } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id', session.user.id)
      .single()

    if (!userData) return

    const userId = userData.id

    /** récupérer les équipes du capitaine */
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId)
      .eq('role', 'captain')

    if (!memberships || memberships.length === 0) return

    const teamIds = memberships.map(m => m.team_id)

    /** récupérer les équipes */
    const { data: teamsData } = await supabase
      .from('teams')
      .select('*')
      .in('id', teamIds)
      .order('name')

    if (teamsData) setTeams(teamsData)

    /** récupérer les matchs */
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .in('team_id', teamIds)
      .order('match_date', { ascending: true })

    if (matchesData) setMatches(matchesData)
  }

  useEffect(() => {
    fetchData()
  }, [])

  return (
    <div className="p-4">

      <div className="space-y-4">

        {teams.map(team => (

          <div key={team.id} className="border border-gray-700 rounded overflow-hidden">

            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold flex justify-between items-center"
              onClick={() => setOpenTeamId(openTeamId === team.id ? null : team.id)}
            >
              <span className="flex items-center">
                <MdSportsTennis className="mr-2" />
                {team.name}
              </span>

              <span className={`transform transition-transform ${openTeamId === team.id ? 'rotate-180' : ''}`}>
                ▼
              </span>

            </button>

            {openTeamId === team.id && (

              <div className="p-4 grid gap-2">

                {matches
                  .filter(m => m.team_id === team.id)
                  .map(match => (

                    <button
                      key={match.id}
                      className={`w-full text-left p-2 rounded ${
                        match.composition_validated
                          ? 'bg-green-700 hover:bg-green-600'
                          : 'bg-gray-700 hover:bg-gray-600'
                      }`}
                      onClick={() => setOpenModal({ matchId: match.id })}
                    >

                      {match.match_date} {match.match_time} - {match.opponent} ({match.location_type})

                      {match.clubadress && (
                        <a
                          href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(match.clubadress)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="ml-2 text-blue-400 underline"
                        >
                          📍
                        </a>
                      )}

                    </button>

                  ))}

              </div>

            )}

          </div>

        ))}

      </div>

      {openModal && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg">

            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenModal(null)}
            >
              Fermer ✕
            </button>

            <MatchForm
              matchId={openModal.matchId}
              onSaved={() => { fetchData(); setOpenModal(null) }}
              onClose={() => setOpenModal(null)}
            />

          </div>

        </div>

      )}

    </div>
  )
}
