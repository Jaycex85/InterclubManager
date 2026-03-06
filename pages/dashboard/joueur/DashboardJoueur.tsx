'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'

type Match = {
  id: string
  opponent: string
  match_date: string
  match_time: string
  location_type: string
}

type Availability = {
  match_id: string
  status: 'available' | 'maybe' | 'unavailable'
}

export default function DashboardJoueur() {
  const [matches, setMatches] = useState<Match[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const userId = session.user.id

    // récupérer les teams du joueur
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId)

    const teamIds = memberships?.map(m => m.team_id) || []

    if (teamIds.length === 0) {
      setLoading(false)
      return
    }

    // récupérer les matchs
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .in('team_id', teamIds)
      .order('match_date', { ascending: true })

    if (matchesData) setMatches(matchesData)

    // récupérer availability du joueur
    const { data: availData } = await supabase
      .from('availability')
      .select('match_id, status')
      .eq('user_id', userId)

    if (availData) setAvailability(availData)

    setLoading(false)
  }

  const setStatus = async (matchId: string, status: 'available' | 'maybe' | 'unavailable') => {

    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const userId = session.user.id

    const existing = availability.find(a => a.match_id === matchId)

    if (existing) {
      await supabase
        .from('availability')
        .update({ status })
        .eq('match_id', matchId)
        .eq('user_id', userId)
    } else {
      await supabase
        .from('availability')
        .insert({
          match_id: matchId,
          user_id: userId,
          status
        })
    }

    fetchData()
  }

  const getStatus = (matchId: string) => {
    const a = availability.find(av => av.match_id === matchId)
    return a?.status
  }

  if (loading) return <div className="text-white p-6">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      <h1 className="text-3xl font-bold text-yellow-400 mb-6">
        Dashboard Joueur
      </h1>

      {matches.length === 0 && (
        <div>Aucun match pour le moment</div>
      )}

      <div className="space-y-4">

        {matches.map(match => {

          const status = getStatus(match.id)

          return (
            <div
              key={match.id}
              className="bg-gray-800 p-4 rounded border border-gray-700"
            >

              <div className="font-bold text-lg">
                vs {match.opponent}
              </div>

              <div className="text-gray-300">
                {match.match_date} — {match.match_time} ({match.location_type})
              </div>

              <div className="mt-4 flex gap-2">

                <button
                  onClick={() => setStatus(match.id,'available')}
                  className={`px-3 py-1 rounded font-bold ${
                    status === 'available'
                      ? 'bg-green-600'
                      : 'bg-gray-700 hover:bg-green-500'
                  }`}
                >
                  Disponible
                </button>

                <button
                  onClick={() => setStatus(match.id,'maybe')}
                  className={`px-3 py-1 rounded font-bold ${
                    status === 'maybe'
                      ? 'bg-yellow-500'
                      : 'bg-gray-700 hover:bg-yellow-400'
                  }`}
                >
                  Peut-être
                </button>

                <button
                  onClick={() => setStatus(match.id,'unavailable')}
                  className={`px-3 py-1 rounded font-bold ${
                    status === 'unavailable'
                      ? 'bg-red-600'
                      : 'bg-gray-700 hover:bg-red-500'
                  }`}
                >
                  Indisponible
                </button>

              </div>

              {status && (
                <div className="text-sm mt-2 text-gray-400">
                  Statut actuel : {status}
                </div>
              )}

            </div>
          )
        })}

      </div>
    </div>
  )
}
