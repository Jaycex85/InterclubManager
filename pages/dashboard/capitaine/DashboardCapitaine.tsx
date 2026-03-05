'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'

const MatchForm = dynamic(() => import('./matches/EditMatch'), { ssr: false })

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
  const [openModal, setOpenModal] = useState<{ matchId: string } | null>(null)

  /** Fetch teams and matches for current captain */
  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .order('name')
    if (!error) setTeams(data || [])
  }

  const fetchMatches = async () => {
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date', { ascending: true })
    if (!error) setMatches(data || [])
  }

  useEffect(() => {
    fetchTeams()
    fetchMatches()
  }, [])

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
                {matches
                  .filter(m => m.team_id === team.id)
                  .map(m => (
                    <button
                      key={m.id}
                      className={`w-full text-left p-2 rounded ${m.composition_validated ? 'bg-green-700 hover:bg-green-600' : 'bg-gray-700 hover:bg-gray-600'}`}
                      onClick={() => setOpenModal({ matchId: m.id })}
                    >
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
                    </button>
                  ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg animate-fadeIn">
            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenModal(null)}
            >
              Fermer ✕
            </button>

            <MatchForm
              matchId={openModal.matchId}
              onSaved={() => { fetchMatches(); setOpenModal(null) }}
              onClose={() => setOpenModal(null)}
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
