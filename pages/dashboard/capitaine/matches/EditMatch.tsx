'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type MatchFormProps = {
  matchId?: string         // édition si présent
  teamId?: string          // pré-sélection si création
  onSaved: () => void
  onClose: () => void
}

type Team = { id: string; name: string }

export default function EditMatch({ matchId, teamId, onSaved, onClose }: MatchFormProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [teamSelected, setTeamSelected] = useState(teamId || '')
  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [locationType, setLocationType] = useState<'domicile' | 'exterieur'>('domicile')
  const [clubaddress, setclubaddress] = useState('')
  const [compositionValidated, setCompositionValidated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  // Fetch teams que le user peut gérer (captain)
  const fetchTeams = async () => {
    const {
      data: sessionData,
      error: sessionError
    } = await supabase.auth.getSession()

    if (sessionError || !sessionData.session?.user) {
      setErrorMsg('Utilisateur non connecté')
      setLoading(false)
      return
    }

    const userId = sessionData.session.user.id

    const { data, error } = await supabase
      .from('team_memberships')
      .select(`team_id, teams(id, name)`)
      .eq('user_id', userId)
      .eq('role', 'captain')

    if (error) {
      setErrorMsg(error.message)
    } else if (data) {
      setTeams(data.map((m: any) => ({ id: m.team_id, name: m.teams.name })))
      if (!teamSelected && data.length) setTeamSelected(data[0].team_id)
    }

    setLoading(false)
  }

  // Fetch match si édition
  const fetchMatch = async () => {
    if (!matchId) return
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (error) {
      setErrorMsg(error.message)
      return
    }

    if (data) {
      setTeamSelected(data.team_id)
      setOpponent(data.opponent)
      setMatchDate(data.match_date)
      setMatchTime(data.match_time)
      setLocationType(data.location_type)
      setclubaddress(data.clubaddress || '')
      setCompositionValidated(data.composition_validated)
    }
  }

  useEffect(() => {
    fetchTeams()
    fetchMatch()
  }, [matchId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg(null)
    if (!teamSelected) {
      setErrorMsg('Veuillez sélectionner une équipe')
      return
    }

    const payload = {
      team_id: teamSelected,
      opponent,
      match_date: matchDate,
      match_time: matchTime,
      location_type: locationType,
      clubaddress: clubaddress,
      composition_validated: compositionValidated,
      updated_at: new Date().toISOString(),
    }

    try {
      let response
      if (matchId) {
        response = await supabase.from('matches').update(payload).eq('id', matchId).select()
      } else {
        response = await supabase.from('matches').insert(payload).select()
      }

      if (response.error) {
        setErrorMsg(response.error.message)
      } else {
        onSaved()
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur inconnue')
    }
  }

  if (loading) return <div>Chargement...</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && <div className="text-red-400 font-bold">{errorMsg}</div>}

      <div>
        <label className="block mb-1">Équipe</label>
        <select
          value={teamSelected}
          onChange={e => setTeamSelected(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        >
          <option value="">-- Sélectionnez une équipe --</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block mb-1">Adversaire</label>
        <input
          type="text"
          value={opponent}
          onChange={e => setOpponent(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block mb-1">Date</label>
          <input
            type="date"
            value={matchDate}
            onChange={e => setMatchDate(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          />
        </div>
        <div>
          <label className="block mb-1">Heure</label>
          <input
            type="time"
            value={matchTime}
            onChange={e => setMatchTime(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
          />
        </div>
      </div>

      <div>
        <label className="block mb-1">Lieu</label>
        <select
          value={locationType}
          onChange={e => setLocationType(e.target.value as 'domicile' | 'exterieur')}
          className="w-full p-2 rounded bg-gray-700 text-white"
        >
          <option value="domicile">Domicile</option>
          <option value="exterieur">Extérieur</option>
        </select>
      </div>

      <div>
        <label className="block mb-1">Addresse du club (optionnel)</label>
        <input
          type="text"
          value={clubaddress}
          onChange={e => setclubaddress(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
        />
      </div>

      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          checked={compositionValidated}
          onChange={e => setCompositionValidated(e.target.checked)}
          id="compositionValidated"
        />
        <label htmlFor="compositionValidated">Composition validée</label>
      </div>

      <div className="flex justify-end space-x-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
        >
          Annuler
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-600 rounded text-black font-bold"
        >
          Enregistrer
        </button>
      </div>
    </form>
  )
}
