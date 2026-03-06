'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'

type Match = {
  id: string
  opponent: string
  match_date: string
  match_time: string
  location_type: string
  composition_validated: boolean
}

type Availability = {
  match_id: string
  status: 'available' | 'maybe' | 'unavailable'
  selection_status: 'selected' | 'not_selected' | 'absent' | null
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

    // 1️⃣ récupérer les équipes du joueur
    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId)

    const teamIds = memberships?.map(m => m.team_id) || []
    if (!teamIds.length) {
      setLoading(false)
      return
    }

    // 2️⃣ récupérer les matchs de ces équipes
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .in('team_id', teamIds)
      .order('match_date', { ascending: true })

    if (matchesData) setMatches(matchesData)

    // 3️⃣ récupérer la disponibilité du joueur
    const { data: availData } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId)
      .in('match_id', matchesData?.map(m => m.id) || [])

    if (availData) setAvailability(availData)

    setLoading(false)
  }

  const setStatus = async (matchId: string, status: 'available' | 'maybe' | 'unavailable') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const userId = session.user.id

    const match = matches.find(m => m.id === matchId)
    if (!match || match.composition_validated) return // bloquer si composition validée

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

  const getSelectionStatus = (matchId: string) => {
    const a = availability.find(av => av.match_id === matchId)
    return a?.selection_status
  }

  if (loading) return <div className="text-white p-6">Chargement...</div>

  // 4️⃣ filtrer les matchs par bloc
  const matchesEnAttente = matches.filter(m => !m.composition_validated)
  const mesMatchs = matches.filter(m =>
    m.composition_validated &&
    getSelectionStatus(m.id) === 'selected'
  )
  const autresMatchs = matches.filter(m =>
    m.composition_validated &&
    getSelectionStatus(m.id) !== 'selected'
  )

  const renderMatch = (m: Match, editable: boolean) => {
    const status = getStatus(m.id)
    return (
      <div key={m.id} className="bg-gray-800 p-4 rounded border border-gray-700">
        <div className="font-bold text-lg">vs {m.opponent}</div>
        <div className="text-gray-300">
          {m.match_date} — {m.match_time} ({m.location_type})
        </div>

        {editable && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={() => setStatus(m.id, 'available')}
              className={`px-3 py-1 rounded font-bold ${status === 'available' ? 'bg-green-600' : 'bg-gray-700 hover:bg-green-500'}`}
            >
              Disponible
            </button>
            <button
              onClick={() => setStatus(m.id, 'maybe')}
              className={`px-3 py-1 rounded font-bold ${status === 'maybe' ? 'bg-yellow-500' : 'bg-gray-700 hover:bg-yellow-400'}`}
            >
              Peut-être
            </button>
            <button
              onClick={() => setStatus(m.id, 'unavailable')}
              className={`px-3 py-1 rounded font-bold ${status === 'unavailable' ? 'bg-red-600' : 'bg-gray-700 hover:bg-red-500'}`}
            >
              Indisponible
            </button>
          </div>
        )}

        {status && (
          <div className="text-sm mt-2 text-gray-400">
            Statut actuel : {status}
          </div>
        )}

        {m.composition_validated && (
          <div className="text-sm mt-1 text-green-400">
            Composition validée — {getSelectionStatus(m.id) === 'selected' ? 'Vous êtes sélectionné' : 'Vous n’êtes pas sélectionné'}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard Joueur</h1>

      {matchesEnAttente.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-200">Matchs en attente</h2>
          {matchesEnAttente.map(m => renderMatch(m, true))}
        </div>
      )}

      {mesMatchs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-200">Mes matchs</h2>
          {mesMatchs.map(m => renderMatch(m, false))}
        </div>
      )}

      {autresMatchs.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xl font-bold text-gray-200">Autres matchs</h2>
          {autresMatchs.map(m => renderMatch(m, false))}
        </div>
      )}

      {matches.length === 0 && <div>Aucun match pour le moment</div>}
    </div>
  )
}
