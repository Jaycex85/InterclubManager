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
  clubaddress?: string
}

type Availability = {
  match_id: string
  status: 'available' | 'unavailable'
  selection_status: 'selected' | 'not_selected' | 'absent' | null
  user_id: string
  first_name?: string
  last_name?: string
  email?: string
}

type ModalData = {
  visible: boolean
  matchName: string
  composition: Availability[]
}

export default function DashboardJoueur() {
  const [matches, setMatches] = useState<Match[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalData>({
    visible: false,
    matchName: '',
    composition: []
  })

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

    // 2️⃣ récupérer les matchs
    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .in('team_id', teamIds)
      .order('match_date', { ascending: true })

    if (matchesData) setMatches(matchesData)

    // 3️⃣ récupérer availability du joueur
    const { data: availData } = await supabase
      .from('availability')
      .select('*')
      .eq('user_id', userId)
      .in('match_id', matchesData?.map(m => m.id) || [])

    if (availData) setAvailability(availData)

    setLoading(false)
  }

  const setStatus = async (matchId: string, status: 'available' | 'unavailable') => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const userId = session.user.id
    const match = matches.find(m => m.id === matchId)
    if (!match || match.composition_validated) return

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
        .insert({ match_id: matchId, user_id: userId, status })
    }

    fetchData()
  }

  const getStatus = (matchId: string) => availability.find(a => a.match_id === matchId)?.status
  const getSelectionStatus = (matchId: string) => availability.find(a => a.match_id === matchId)?.selection_status

  if (loading) return <div className="text-white p-6">Chargement...</div>

  const matchesEnAttente = matches.filter(m => !m.composition_validated)
  const mesMatchs = matches.filter(m =>
    m.composition_validated && getSelectionStatus(m.id) === 'selected'
  )
  const autresMatchs = matches.filter(m =>
    m.composition_validated && getSelectionStatus(m.id) !== 'selected'
  )

  const renderMatch = (m: Match, editable: boolean) => {
    const status = getStatus(m.id)
    const selection = getSelectionStatus(m.id)

    const bgColor = editable
      ? 'bg-yellow-800'
      : selection === 'selected'
        ? 'bg-green-700'
        : 'bg-gray-700'

    return (
      <div key={m.id} className={`p-4 rounded border border-gray-600 ${bgColor}`}>
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold text-lg">vs {m.opponent}</div>
            <div className="text-gray-300">
              {m.match_date} — {m.match_time} ({m.location_type})
            </div>
          </div>
          {m.clubaddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubaddress)}`}
              target="_blank"
              rel="noreferrer"
              className="ml-4 px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-500"
            >
              📍
            </a>
          )}
        </div>

        {editable && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setStatus(m.id, 'available')}
              className={`px-3 py-1 rounded font-bold ${status === 'available' ? 'bg-green-500' : 'bg-gray-600 hover:bg-green-400'}`}
            >
              Disponible
            </button>
            <button
              onClick={() => setStatus(m.id, 'unavailable')}
              className={`px-3 py-1 rounded font-bold ${status === 'unavailable' ? 'bg-red-500' : 'bg-gray-600 hover:bg-red-400'}`}
            >
              Indisponible
            </button>
          </div>
        )}

        {status && (
          <div className="text-sm mt-2 text-gray-200">Statut actuel : {status}</div>
        )}

        {m.composition_validated && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-green-200 text-sm font-bold">
              Composition validée — {selection === 'selected' ? 'Vous êtes sélectionné' : 'Vous n’êtes pas sélectionné'}
            </span>
            <button
              className="px-2 py-1 text-black bg-yellow-400 rounded hover:bg-yellow-300 text-sm"
              onClick={() => {
                const comp = availability.filter(a => a.match_id === m.id)
                setModal({ visible: true, matchName: `vs ${m.opponent}`, composition: comp })
              }}
            >
              Voir composition
            </button>
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

      {/* Modal Composition */}
      {modal.visible && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-gray-900 p-6 rounded max-h-[80vh] overflow-y-auto w-[90%] max-w-xl">
            <h2 className="text-xl font-bold mb-4">{modal.matchName}</h2>
            <div className="space-y-2">
              {modal.composition.map(p => {
                const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
                const label = fullName ? `${fullName} (${p.email})` : p.email
                return (
                  <div key={p.user_id} className="flex justify-between p-2 bg-gray-800 rounded">
                    <span>{label}</span>
                    <span className={`font-bold ${p.selection_status === 'selected' ? 'text-green-400' : 'text-gray-400'}`}>
                      {p.selection_status || 'Non sélectionné'}
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 flex justify-end">
              <button
                className="px-4 py-2 bg-red-500 rounded hover:bg-red-400"
                onClick={() => setModal({ ...modal, visible: false })}
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
