'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'

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
  const [openModal, setOpenModal] = useState<{ matchId: string; type: 'match' | 'composition' } | null>(null)
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string | null>(null)

  // 🔹 Récupération du userId
  useEffect(() => {
    const getUserId = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session?.user) {
        window.location.href = '/auth'
        return
      }
      setUserId(session.user.id)
    }
    getUserId()
  }, [])

  // 🔹 Fetch équipes où l'utilisateur est capitaine
  useEffect(() => {
    if (!userId) return

    const fetchTeams = async () => {
      const { data, error } = await supabase
        .from('team_memberships')
        .select(`team_id, teams(name)`)
        .eq('user_id', userId)
        .eq('role', 'captain')
      if (!error && data) {
        const formatted = data.map((m: any) => ({
          id: m.team_id,
          name: m.teams.name
        }))
        setTeams(formatted)
      }
      setLoading(false)
    }

    fetchTeams()
  }, [userId])

  // 🔹 Fetch matchs pour les équipes du capitaine
  useEffect(() => {
    if (!teams.length) return

    const fetchMatches = async () => {
      const teamIds = teams.map(t => t.id)
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .in('team_id', teamIds)
        .order('match_date', { ascending: true })
      if (!error && data) setMatches(data || [])
    }

    fetchMatches()
  }, [teams])

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      Chargement des équipes et matchs...
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">
        Dashboard Capitaine
      </h1>

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
                  <button
                    key={m.id}
                    className={`w-full text-left p-2 rounded flex justify-between items-center
                      ${m.composition_validated ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                    onClick={() => setOpenModal({ matchId: m.id, type: 'match' })}
                  >
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
                    {m.composition_validated ? (
                      <span className="text-yellow-400 font-bold">✔</span>
                    ) : (
                      <span className="text-red-400 font-bold">✕</span>
                    )}
                  </button>
                ))}

                <button
                  className="w-full p-2 bg-yellow-500 hover:bg-yellow-600 rounded font-bold text-black"
                  onClick={() => setOpenModal({ matchId: '', type: 'match' })}
                >
                  + Créer un match
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* 🔹 Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg animate-fadeIn">
            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenModal(null)}
            >
              Fermer ✕
            </button>

            {openModal.type === 'match' && (
              <MatchForm
                matchId={openModal.matchId}
                onSaved={() => { setOpenModal(null); /* re-fetch matches */ }}
                onClose={() => setOpenModal(null)}
              />
            )}

            {openModal.type === 'composition' && (
              <CompositionForm
                matchId={openModal.matchId}
                onSaved={() => { setOpenModal(null); /* re-fetch availability */ }}
                onClose={() => setOpenModal(null)}
              />
            )}
          </div>
        </div>
      )}

      {/* Animation Tailwind */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}
