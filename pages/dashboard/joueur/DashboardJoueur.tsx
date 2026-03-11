'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'

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

type ModalData = {
  visible: boolean
  matchName: string
  composition: ModalPlayer[]
}

type Props = {
  teamId: string
}

export default function DashboardJoueur({ teamId }: Props) {
  const [matches, setMatches] = useState<Match[]>([])
  const [availability, setAvailability] = useState<Availability[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<ModalData>({ visible: false, matchName: '', composition: [] })
  const [userId, setUserId] = useState<string>('')

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      setUserId(user.id)

      const { data: matchesData } = await supabase
        .from('matches')
        .select('*')
        .eq('team_id', teamId)
        .order('match_date', { ascending: true })

      const matchList = matchesData?.map(m => ({ ...m, team_id: String(m.team_id) })) || []
      setMatches(matchList)

      const matchIds = matchList.map(m => m.id)
      if (matchIds.length > 0) {
        const { data: availData } = await supabase
          .from('availability')
          .select('match_id, user_id, status, selection_status')
          .in('match_id', matchIds)
        setAvailability(availData || [])
      }

      setLoading(false)
    }
    init()
  }, [teamId])

  const setStatus = async (matchId: string, status: 'available' | 'unavailable') => {
    if (!userId) return
    const match = matches.find(m => m.id === matchId)
    if (!match || match.composition_validated) return

    const existing = availability.find(a => a.match_id === matchId && a.user_id === userId)
    if (existing) {
      await supabase.from('availability')
        .update({ status })
        .eq('match_id', matchId)
        .eq('user_id', userId)
    } else {
      await supabase.from('availability')
        .insert({ match_id: matchId, user_id, status })
    }

    setAvailability(prev =>
      existing
        ? prev.map(a => a.match_id === matchId && a.user_id === userId ? { ...a, status } : a)
        : [...prev, { match_id: matchId, user_id, status, selection_status: null }]
    )
  }

  const getStatus = (matchId: string) => availability.find(a => a.match_id === matchId && a.user_id === userId)?.status
  const getSelectionStatus = (matchId: string) => availability.find(a => a.match_id === matchId && a.user_id === userId)?.selection_status

  const showComposition = async (matchId: string, matchName: string) => {
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
      setModal({ visible: true, matchName, composition: comp })
    }
  }

  const renderMatchCard = (m: Match, editable: boolean) => {
    const status = getStatus(m.id)
    const selection = getSelectionStatus(m.id)

    return (
      <div key={m.id} className="bg-gray-800 border border-gray-600 rounded-lg p-4 shadow hover:shadow-lg transition flex flex-col gap-3">
        <div className="flex justify-between items-start sm:items-center flex-wrap gap-2">
          <div>
            <h4 className="font-bold text-lg text-yellow-400">{m.opponent}</h4>
            <p className="text-gray-300 text-sm">{m.match_date} — {m.match_time} ({m.location_type})</p>
          </div>
          {m.clubaddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubaddress)}`}
              target="_blank"
              rel="noreferrer"
              className="px-2 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-sm"
            >
              📍 Adresse
            </a>
          )}
        </div>

        {editable && (
          <div className="flex flex-wrap gap-2 mt-2">
            <button
              onClick={() => setStatus(m.id, 'available')}
              className={`px-3 py-1 rounded font-bold ${status === 'available' ? 'bg-green-400 text-black' : 'bg-gray-700 hover:bg-green-300'}`}
            >
              Disponible
            </button>
            <button
              onClick={() => setStatus(m.id, 'unavailable')}
              className={`px-3 py-1 rounded font-bold ${status === 'unavailable' ? 'bg-red-400 text-black' : 'bg-gray-700 hover:bg-red-300'}`}
            >
              Indisponible
            </button>
          </div>
        )}

        {status && <p className="text-gray-200 text-sm mt-1">Statut actuel : {status}</p>}

        {m.composition_validated && (
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <span className="text-green-300 text-sm font-bold">
              Composition validée — {selection === 'selected' ? 'Vous êtes sélectionné' : 'Vous n’êtes pas sélectionné'}
            </span>
            <button
              onClick={() => showComposition(m.id, m.opponent)}
              className="px-2 py-1 bg-yellow-400 text-black rounded hover:bg-yellow-300 text-sm"
            >
              Voir composition
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="p-6 text-white">Chargement...</div>

  // Catégorisation des matchs
  const matchesEnAttente = matches.filter(m => !m.composition_validated)
  const mesMatchs = matches.filter(m => m.composition_validated && getSelectionStatus(m.id) === 'selected')
  const autresMatchs = matches.filter(m => m.composition_validated && getSelectionStatus(m.id) !== 'selected')

  return (
    <div className="space-y-6">
      {matchesEnAttente.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-orange-400">Matchs en attente</h3>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">{matchesEnAttente.map(m => renderMatchCard(m, true))}</div>
        </div>
      )}

      {mesMatchs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-green-400">Mes matchs</h3>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">{mesMatchs.map(m => renderMatchCard(m, false))}</div>
        </div>
      )}

      {autresMatchs.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xl font-bold text-red-400">Autres matchs</h3>
          <div className="grid gap-4 sm:grid-cols-1 lg:grid-cols-2">{autresMatchs.map(m => renderMatchCard(m, false))}</div>
        </div>
      )}

      {matches.length === 0 && <p className="text-gray-300">Aucun match pour le moment</p>}

      {/* Modal composition */}
      {modal.visible && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded max-h-[80vh] overflow-y-auto w-[90%] max-w-xl">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">{modal.matchName}</h2>
            <div className="space-y-2">
              {modal.composition.map(p => {
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
