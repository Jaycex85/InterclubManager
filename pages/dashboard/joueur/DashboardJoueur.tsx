'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'

type Team = {
  id: string
  name: string
}

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

export default function DashboardJoueur() {
  const [teams, setTeams] = useState<Team[]>([])
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

      // 1️⃣ Récupérer les équipes du joueur
      const { data: memberships } = await supabase
        .from('team_memberships')
        .select('team_id')
        .eq('user_id', user.id)

      const teamIds = memberships?.map(m => String(m.team_id)) || []

      // 2️⃣ Récupérer les noms des équipes
      const { data: teamsData } = await supabase
        .from('teams')
        .select('id, name')
        .in('id', teamIds)

      const userTeams: Team[] = teamsData?.map(t => ({ id: t.id, name: t.name })) || []
      setTeams(userTeams)

      // 3️⃣ Récupérer tous les matchs en **un seul fetch**
      if (teamIds.length > 0) {
        const { data: matchesData } = await supabase
          .from('matches')
          .select('*')
          .in('team_id', teamIds)
          .order('match_date', { ascending: true })

        const allMatches = matchesData?.map(m => ({ ...m, team_id: String(m.team_id) })) || []
        setMatches(allMatches)

        // 4️⃣ Récupérer toutes les disponibilités liées aux matchs
        const matchIds = allMatches.map(m => m.id)
        if (matchIds.length > 0) {
          const { data: availData } = await supabase
            .from('availability')
            .select('*')
            .in('match_id', matchIds)
          if (availData) setAvailability(availData)
        }
      }

      setLoading(false)
    }

    init()
  }, [])

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

  const renderMatch = (m: Match, editable: boolean) => {
    const status = getStatus(m.id)
    const selection = getSelectionStatus(m.id)

    return (
      <div key={m.id} className="p-4 rounded border border-gray-700 bg-gray-800">
        <div className="flex justify-between items-center">
          <div>
            <div className="font-bold text-lg">{m.opponent}</div>
            <div className="text-gray-200">{m.match_date} — {m.match_time} ({m.location_type})</div>
          </div>
          {m.clubaddress && (
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(m.clubaddress)}`}
              target="_blank"
              rel="noreferrer"
              className="ml-4 px-2 py-1 text-white rounded hover:text-yellow-400"
            >
              📍
            </a>
          )}
        </div>

        {editable && (
          <div className="mt-3 flex gap-2">
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

        {status && <div className="text-sm mt-2 text-gray-100">Statut actuel : {status}</div>}

        {m.composition_validated && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-green-200 text-sm font-bold">
              Composition validée — {selection === 'selected' ? 'Vous êtes sélectionné' : 'Vous n’êtes pas sélectionné'}
            </span>
            <button
              className="px-2 py-1 text-black bg-yellow-400 rounded hover:bg-yellow-300 text-sm"
              onClick={() => showComposition(m.id, m.opponent)}
            >
              Voir composition
            </button>
          </div>
        )}
      </div>
    )
  }

  if (loading) return <div className="text-white p-6">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Dashboard Joueur</h1>

      {teams.map(team => {
        // 🔹 Filtrer uniquement les matchs correspondant à cette équipe
        const teamMatches = matches.filter(m => m.team_id === team.id)
        if (!teamMatches.length) return null

        const matchesEnAttente = teamMatches.filter(m => !m.composition_validated)
        const mesMatchs = teamMatches.filter(m => m.composition_validated && getSelectionStatus(m.id) === 'selected')
        const autresMatchs = teamMatches.filter(m => m.composition_validated && getSelectionStatus(m.id) !== 'selected')

        return (
          <div key={team.id} className="space-y-4">
            <h2 className="text-2xl font-bold text-indigo-400">{team.name}</h2>

            {matchesEnAttente.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-orange-400">Matchs en attente</h3>
                {matchesEnAttente.map(m => renderMatch(m, true))}
              </div>
            )}

            {mesMatchs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-green-400">Mes matchs</h3>
                {mesMatchs.map(m => renderMatch(m, false))}
              </div>
            )}

            {autresMatchs.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-red-400">Autres matchs</h3>
                {autresMatchs.map(m => renderMatch(m, false))}
              </div>
            )}
          </div>
        )
      })}

      {matches.length === 0 && <div>Aucun match pour le moment</div>}

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
