'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'

// Modals dynamiques
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
  clubadress: string | null
  composition_validated: boolean
}

export default function DashboardCapitaine() {
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)
  const [openCompositionId, setOpenCompositionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Fetch équipes + matchs du capitaine
  const fetchData = async () => {
    setLoading(true)
    setErrorMsg('')

    const user = supabase.auth.getUser()?.data.user
    if (!user) {
      setErrorMsg("Utilisateur non connecté")
      setLoading(false)
      return
    }

    try {
      // 1️⃣ Teams du capitaine
      const { data: teamData, error: teamError } = await supabase
        .from('team_memberships')
        .select(`team_id, teams(id, name)`)
        .eq('user_id', user.id)
        .eq('role', 'captain')

      if (teamError) throw teamError
      if (!teamData || teamData.length === 0) {
        setTeams([])
        setMatches([])
        setLoading(false)
        return
      }

      const formattedTeams = teamData.map((t: any) => ({
        id: t.team_id,
        name: t.teams.name
      }))
      setTeams(formattedTeams)

      // 2️⃣ Matchs pour ces équipes
      const teamIds = formattedTeams.map(t => t.id)
      const { data: matchData, error: matchError } = await supabase
        .from('matches')
        .select('*')
        .in('team_id', teamIds)
        .order('match_date', { ascending: true })

      if (matchError) throw matchError
      setMatches(matchData || [])
    } catch (err: any) {
      console.error("Erreur fetchData:", err)
      setErrorMsg(err.message || 'Erreur inconnue')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  if (loading) return <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">
        Dashboard Capitaine
      </h1>

      {errorMsg && <div className="bg-red-600 p-2 rounded mb-4">{errorMsg}</div>}

      {teams.length === 0 ? (
        <div className="text-gray-400">Vous n’êtes capitaine d’aucune équipe pour l’instant.</div>
      ) : (
        <div className="space-y-4">
          {teams.map(team => (
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
                  {matches.filter(m => m.team_id === team.id).map(m => (
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
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modals */}
      {openMatchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg animate-fadeIn">
            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenMatchId(null)}
            >
              Fermer ✕
            </button>
            <MatchForm
              matchId={openMatchId}
              onSaved={() => { setOpenMatchId(null); fetchData() }}
              onClose={() => setOpenMatchId(null)}
            />
          </div>
        </div>
      )}

      {openCompositionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg animate-fadeIn">
            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenCompositionId(null)}
            >
              Fermer ✕
            </button>
            <CompositionForm
              matchId={openCompositionId}
              onSaved={() => { setOpenCompositionId(null); fetchData() }}
              onClose={() => setOpenCompositionId(null)}
            />
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>
    </div>
  )
}
