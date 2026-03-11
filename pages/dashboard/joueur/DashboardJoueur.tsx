'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'
import { FiMapPin } from 'react-icons/fi'

type Match = {
  id: string
  team_id: string
  opponent: string
  match_date: string
  match_time: string
  location_type: string
  composition_validated: boolean
  clubaddress?: string
}

type Availability = {
  match_id: string
  status: 'available' | 'unavailable'
  selection_status: 'selected' | 'not_selected' | 'absent' | null
  user_id: string
}

type ModalPlayer = {
  user_id: string
  selection_status: 'selected' | 'not_selected' | 'absent' | null
  first_name?: string
  last_name?: string
  email?: string
}

type Props = {
  teamId: string
  teamName: string
}

export default function DashboardJoueur({ teamId, teamName }: Props) {
  const [matches, setMatches] = useState<Match[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [userId, setUserId] = useState<string>('')
  const [openCompositionId, setOpenCompositionId] = useState<string | null>(null)
  const [modalComposition, setModalComposition] = useState<ModalPlayer[]>([])

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: matchData } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: true })

      setMatches(matchData || [])

      const matchIds = matchData?.map(m => m.id) || []
      if (matchIds.length > 0) {
        const { data: availData } = await supabase
          .from('availability')
          .select('match_id, user_id, status, selection_status')
          .in('match_id', matchIds)
        setAvailability(availData || [])
      }

      setLoading(false)
    }
    fetchData()
  }, [teamId])

  const setStatus = async (matchId: string, status: 'available' | 'unavailable') => {
    if (!userId) return
    const match = matches.find(m => m.id === matchId)
    if (!match || match.composition_validated) return

    const existing = availability.find(a => a.match_id === matchId && a.user_id === userId)
    if (existing) {
      await supabase
        .from('availability')
        .update({ status })
        .eq('match_id', matchId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('availability')
        .insert({ match_id: matchId, user_id: userId, status })
    }

    setAvailability(prev =>
      existing
        ? prev.map(a => (a.match_id === matchId && a.user_id === userId ? { ...a, status } : a))
        : [...prev, { match_id: matchId, user_id: userId, status, selection_status: null }]
    )
  }

  const getStatus = (matchId: string) =>
    availability.find(a => a.match_id === matchId && a.user_id === userId)?.status

  const getSelectionStatus = (matchId: string) =>
    availability.find(a => a.match_id === matchId && a.user_id === userId)?.selection_status

  const showComposition = async (matchId: string) => {
    const { data } = await supabase
      .from('availability')
      .select('user_id, selection_status, users(first_name, last_name, email)')
      .eq('match_id', matchId)
      .eq('selection_status', 'selected')

    if (data) {
      const comp: ModalPlayer[] = data.map((a: any) => ({
        user_id: a.user_id,
        selection_status: a.selection_status,
        first_name: a.users?.first_name,
        last_name: a.users?.last_name,
        email: a.users?.email
      }))
      setModalComposition(comp)
      setOpenCompositionId(matchId)
    }
  }

  if (loading) return <div className="text-white p-6">Chargement...</div>

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-gray-800 p-4 rounded-lg shadow-md">
        <div className="flex items-center gap-2">
          <MdSportsTennis className="text-yellow-400" size={28} />
          <h1 className="text-2xl font-bold text-white">{teamName}</h1>
        </div>
      </div>

      {/* Matches Grid */}
      <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {matches.length === 0 && (
          <div className="text-gray-400 col-span-full text-center py-6">Aucun match pour cette équipe</div>
        )}

        {matches.map(m => {
          const status = getStatus(m.id)
          const selection = getSelectionStatus(m.id)
          const compositionValidated = m.composition_validated

          return (
            <div
              key={m.id}
              className="bg-gray-700 hover:bg-gray-600 rounded-lg shadow-md p-4 flex flex-col justify-between transition"
            >
              {/* Match Info */}
              <div className="mb-3">
                <p className="text-white font-semibold text-lg">{m.match_date} {m.match_time}</p>
                <p className="text-gray-300 font-medium">{m.opponent} ({m.location_type})</p>
                {m.clubaddress && (
                  <a
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubaddress)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 text-blue-400 mt-1 font-medium"
                  >
                    <FiMapPin /> Voir sur carte
                  </a>
                )}
                {compositionValidated && (
                  <span className="inline-block mt-2 px-2 py-1 text-xs font-semibold text-green-800 bg-green-200 rounded-full">
                    Composition validée
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="flex flex-col sm:flex-row sm:justify-end gap-2 mt-2">
                {!compositionValidated && (
                  <>
                    <button
                      onClick={() => setStatus(m.id, 'available')}
                      className={`px-3 py-1 rounded font-semibold transition ${
                        status === 'available'
                          ? 'bg-green-400 text-black'
                          : 'bg-gray-700 hover:bg-green-300 text-white'
                      }`}
                    >
                      Disponible
                    </button>
                    <button
                      onClick={() => setStatus(m.id, 'unavailable')}
                      className={`px-3 py-1 rounded font-semibold transition ${
                        status === 'unavailable'
                          ? 'bg-red-400 text-black'
                          : 'bg-gray-700 hover:bg-red-300 text-white'
                      }`}
                    >
                      Indisponible
                    </button>
                  </>
                )}
                {compositionValidated && (
                  <button
                    onClick={() => showComposition(m.id)}
                    className="px-3 py-1 bg-blue-500 hover:bg-blue-400 text-white rounded font-semibold transition"
                  >
                    Voir composition
                  </button>
                )}
              </div>

              {compositionValidated && status && (
                <div className="mt-2 text-gray-100 text-sm">
                  {selection === 'selected' ? 'Vous êtes sélectionné' : 'Vous n’êtes pas sélectionné'}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Modal Composition */}
      {openCompositionId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded-lg shadow-xl w-full max-w-lg animate-fadeIn">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-yellow-400">Composition</h2>
              <button
                className="text-red-400 hover:text-red-600 font-bold"
                onClick={() => setOpenCompositionId(null)}
              >
                ✕
              </button>
            </div>
            <div className="space-y-2">
              {modalComposition.map(p => {
                const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
                const label = fullName ? `${fullName} (${p.email})` : p.email || 'Nom inconnu'
                return (
                  <div key={p.user_id} className="flex justify-between p-2 bg-gray-700 rounded">
                    <span>{label}</span>
                    <span className="font-bold text-green-400">Sélectionné</span>
                  </div>
                )
              })}
            </div>
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
