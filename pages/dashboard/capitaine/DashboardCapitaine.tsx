'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'

const MatchForm = dynamic(() => import('./matches/EditMatch'), { ssr: false })
const CompositionForm = dynamic(() => import('./matches/EditComposition'), { ssr: false })

type Match = {
  id: string
  team_id: string
  opponent: string
  match_date: string
  match_time: string
  location_type: string
  clubaddress: string
  composition_validated: boolean
}

type Props = {
  teamId: string
  teamName: string
}

export default function DashboardCapitaine({ teamId, teamName }: Props) {
  const [matches, setMatches] = useState<Match[]>([])
  const [openMatchId, setOpenMatchId] = useState<string | null>(null)
  const [openCompositionId, setOpenCompositionId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMatches = async () => {
      const { data: matchData, error } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: true })

      if (error) console.error(error)
      setMatches(matchData || [])
      setLoading(false)
    }

    fetchMatches()
  }, [teamId])

  if (loading) return <div>Chargement...</div>

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center bg-gray-800 p-4 rounded shadow">
        <MdSportsTennis className="mr-2 text-yellow-400" size={24} /> 
        <h1 className="text-xl font-bold text-white">{teamName}</h1>
      </div>

      {/* Bouton Ajouter */}
      <div className="flex justify-end">
        <button
          className="px-4 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded shadow"
          onClick={() => setOpenMatchId('new')}
        >
          + Ajouter un match
        </button>
      </div>

      {/* Liste des matchs */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {matches.length === 0 && <div className="text-gray-400">Aucun match pour cette équipe</div>}

        {matches.map((m) => (
          <div
            key={m.id}
            className="bg-gray-700 hover:bg-gray-600 rounded shadow p-4 flex flex-col justify-between"
          >
            {/* Info match */}
            <div className="mb-3">
              <p className="text-white font-semibold">{m.match_date} {m.match_time}</p>
              <p className="text-gray-300">{m.opponent} ({m.location_type}) 
                {m.clubaddress && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubaddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="ml-2 text-blue-400 underline"
                  >
                    📍
                  </a>
                )}
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <button
                className={`px-3 py-1 rounded font-bold ${
                  m.composition_validated
                    ? 'bg-green-600 hover:bg-green-500 text-white'
                    : 'bg-yellow-500 hover:bg-yellow-400 text-white'
                }`}
                onClick={() => setOpenMatchId(m.id)}
              >
                Editer Match
              </button>
              <button
                className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded font-bold"
                onClick={() => setOpenCompositionId(m.id)}
              >
                Composition
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Modal Match */}
      {openMatchId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg animate-fadeIn">
            <button className="mb-4 text-red-400 hover:text-red-600 font-bold" onClick={() => setOpenMatchId(null)}>
              Fermer ✕
            </button>
            <MatchForm
              matchId={openMatchId === 'new' ? undefined : openMatchId}
              onSaved={() => {
                setOpenMatchId(null)
                setLoading(true)
                setTimeout(() => setLoading(false), 100)
              }}
              onClose={() => setOpenMatchId(null)}
              teamId={openMatchId === 'new' ? teamId : undefined}
            />
          </div>
        </div>
      )}

      {/* Modal Composition */}
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
              onSaved={() => {
                setOpenCompositionId(null)
                setLoading(true)
                setTimeout(() => setLoading(false), 100)
              }}
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
        .animate-fadeIn { animation: fadeIn 0.3s ease-out; }
      `}</style>
    </div>
  )
}
