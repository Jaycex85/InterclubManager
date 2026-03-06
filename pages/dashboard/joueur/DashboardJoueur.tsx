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
  status: 'available' | 'unavailable'
  selection_status: 'selected' | 'not_selected' | 'absent' | null
  user_id: string
}

type ModalMatch = {
  open: boolean
  match?: Match
  composition?: Availability[]
}

export default function DashboardJoueur() {
  const [matches, setMatches] = useState<Match[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalMatch>({ open: false })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const userId = session.user.id

    const { data: memberships } = await supabase
      .from('team_memberships')
      .select('team_id')
      .eq('user_id', userId)

    const teamIds = memberships?.map(m => m.team_id) || []
    if (!teamIds.length) {
      setLoading(false)
      return
    }

    const { data: matchesData } = await supabase
      .from('matches')
      .select('*')
      .in('team_id', teamIds)
      .order('match_date', { ascending: true })

    if (matchesData) setMatches(matchesData)

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
        .insert({
          match_id: matchId,
          user_id: userId,
          status
        })
    }

    fetchData()
  }

  const getStatus = (matchId: string) => availability.find(a => a.match_id === matchId)?.status
  const getSelectionStatus = (matchId: string) => availability.find(a => a.match_id === matchId)?.selection_status

  const openComposition = async (match: Match) => {
    // récupérer la composition pour ce match
    const { data } = await supabase
      .from('availability')
      .select(`user_id, status, selection_status, users(first_name, last_name, email)`)
      .eq('match_id', match.id)

    const composition = (data || []).map((a: any) => ({
      ...a,
      user_id: a.user_id,
      status: a.status,
      selection_status: a.selection_status,
      first_name: a.users.first_name,
      last_name: a.users.last_name,
      email: a.users.email
    }))

    setModal({ open: true, match, composition })
  }

  if (loading) return <div className="text-white p-6">Chargement...</div>

  // filtrer les matchs
  const matchesEnAttente = matches.filter(m => !m.composition_validated)
  const mesMatchs = matches.filter(m =>
    m.composition_validated && getSelectionStatus(m.id) === 'selected'
  )
  const autresMatchs = matches.filter(m =>
    m.composition_validated && getSelectionStatus(m.id) !== 'selected'
  )

  const renderMatch = (m: Match, editable: boolean) => {
    const status = getStatus(m.id)
    const selected = getSelectionStatus(m.id) === 'selected'

    // couleur du bloc
    let bgColor = 'bg-gray-800'
    if (!m.composition_validated) bgColor = 'bg-gray-700'
    else if (selected) bgColor = 'bg-green-700'
    else bgColor = 'bg-red-700'

    return (
      <div key={m.id} className={`${bgColor} p-4 rounded border border-gray-600`}>
        <div className="font-bold text-lg">vs {m.opponent}</div>
        <div className="text-gray-200">
          {m.match_date} — {m.match_time} ({m.location_type})
        </div>

        {editable && (
          <div className="mt-3 flex gap-2">
            <button
              onClick={() => setStatus(m.id, 'available')}
              className={`px-3 py-1 rounded font-bold ${status === 'available' ? 'bg-green-600' : 'bg-gray-600 hover:bg-green-500'}`}
            >
              Disponible
            </button>
            <button
              onClick={() => setStatus(m.id, 'unavailable')}
              className={`px-3 py-1 rounded font-bold ${status === 'unavailable' ? 'bg-red-600' : 'bg-gray-600 hover:bg-red-500'}`}
            >
              Indisponible
            </button>
          </div>
        )}

        {m.composition_validated && (
          <div className="mt-2 flex justify-between items-center">
            <div className="text-sm text-gray-100">
              {selected ? 'Vous êtes sélectionné ✅' : 'Vous n’êtes pas sélectionné ❌'}
            </div>
            <button
              onClick={() => openComposition(m)}
              className="px-2 py-1 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold text-sm"
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

      {/* ---------- MODAL COMPOSITION ---------- */}
      {modal.open && modal.match && modal.composition && (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-900 text-white rounded p-6 max-w-lg w-full max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Composition - vs {modal.match.opponent}</h2>
            <div className="space-y-2">
              {modal.composition.map(p => {
                const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
                return (
                  <div
                    key={p.user_id}
                    className={`p-2 rounded flex justify-between items-center ${
                      p.selection_status === 'selected'
                        ? 'bg-green-600'
                        : p.selection_status === 'absent'
                        ? 'bg-red-600'
                        : 'bg-gray-700'
                    }`}
                  >
                    <span>{fullName || p.email}</span>
                    <span className="text-sm text-gray-100">{p.selection_status || 'non sélectionné'}</span>
                  </div>
                )
              })}
            </div>
            <button
              className="mt-4 px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded font-bold"
              onClick={() => setModal({ open: false })}
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
