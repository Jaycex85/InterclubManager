'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'

const MatchForm = dynamic(() => import('./matches/EditMatch'), { ssr: false })
const CompositionForm = dynamic(() => import('./matches/EditComposition'), { ssr: false })

type Team = { id: string; name: string }
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
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)
  const [openCompositionId, setOpenCompositionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const fetchData = async () => {
    setLoading(true)
    setErrorMsg(null)

    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    if (sessionError || !session?.user) {
      setErrorMsg('Utilisateur non connecté')
      setLoading(false)
      return
    }

    const userId = session.user.id

    // 1️⃣ récupérer les équipes dont l'utilisateur est capitaine
    const { data: teamData, error: teamError } = await supabase
      .from('team_memberships')
      .select('team_id, role, teams(id, name)')
      .eq('user_id', userId)
      .eq('role', 'captain')

    if (teamError) setErrorMsg(teamError.message)
    if (teamData) setTeams(teamData.map((m: any) => ({ id: m.team_id, name: m.teams.name })))

    // 2️⃣ récupérer tous les matches pour ces équipes
    if (teamData?.length) {
      const teamIds = teamData.map((t: any) => t.team_id)
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .in('team_id', teamIds)
        .order('match_date', { ascending: true })
      if (matchError) console.error(matchError)
      if (matchData) setMatches(matchData)
    }

    setLoading(false)
  }

  useEffect(() => { fetchData() }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Chargement...</div>
  if (errorMsg) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-red-400">{errorMsg}</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard Capitaine</h1>

      {teams.length === 0 ? (
        <div className="text-gray-400">Vous n’êtes capitaine d’aucune équipe pour l’instant.</div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => {
            const teamMatches = matches.filter(m => m.team_id === team.id)
            return (
              <div key={team.id} className="border border-gray-700 rounded overflow-hidden">
                <button
                  className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold flex justify-between items-center"
                  onClick={() => setOpenTeamId(openTeamId === team.id ? null : team.id)}
                >
                  <span className="flex items-center"><MdSportsTennis className="mr-2" /> {team.name}</span>
                  <span className={`ml-2 transform transition-transform duration-300 ${openTeamId === team.id ? 'rotate-180' : ''}`}>▼</span>
                </button>

                {openTeamId === team.id && (
                  <div className="p-4 grid gap-2">
                    {teamMatches.length === 0 ? (
                      <div className="text-gray-400">Aucun match programmé pour cette équipe.</div>
                    ) : (
                      teamMatches.map(m => (
                        <div key={m.id} className="flex justify-between items-center bg-gray-700 hover:bg-gray-600 rounded p-2">
                          <div>
                            {m.match_date} {m.match_time} - {m.opponent} ({m.location_type})
                            {m.clubadress && (
                              <a
                                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubadress)}`}
                                target="_blank"
                                rel="noreferrer"
                                className="ml-2 text-blue-400 underline"
                              >
                                📍
                              </a>
                            )}
                          </div>
                          <div className="space-x-2">
                            <button
                              className={`px-2 py-1 rounded ${m.composition_validated ? 'bg-green-600 hover:bg-green-500' : 'bg-yellow-500 hover:bg-yellow-400'} font-bold`}
                              onClick={() => setOpenMatchId(m.id)}
                            >
                              Editer Match
                            </button>
                            <button
                              className="px-2 py-1 bg-blue-500 hover:bg-blue-400 rounded font-bold"
                              onClick={() => setOpenCompositionId(m.id)}
                            >
                              Composition
                            </button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {openMatchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg">
            <button className="mb-4 text-red-400 hover:text-red-600 font-bold" onClick={() => setOpenMatchId(null)}>Fermer ✕</button>
            <MatchForm matchId={openMatchId} onSaved={() => { setOpenMatchId(null); fetchData() }} onClose={() => setOpenMatchId(null)} />
          </div>
        </div>
      )}

      {openCompositionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg">
            <button className="mb-4 text-red-400 hover:text-red-600 font-bold" onClick={() => setOpenCompositionId(null)}>Fermer ✕</button>
            <CompositionForm matchId={openCompositionId} onSaved={() => { setOpenCompositionId(null); fetchData() }} onClose={() => setOpenCompositionId(null)} />
          </div>
        </div>
      )}
    </div>
  )
}
