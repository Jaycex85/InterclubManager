'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type MatchFormProps = {
  matchId?: string        // si édition
  teamId?: string         // pré-sélection si création
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
  const [locationType, setLocationType] = useState<'Domicile' | 'Extérieur'>('Domicile')
  const [clubaddress, setClubaddress] = useState('')
  const [compositionValidated, setCompositionValidated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // Récupère les équipes pour le select
  const fetchTeams = async () => {
    const { data, error } = await supabase.from('teams').select('*').order('name')
    if (error) console.error(error)
    if (data) setTeams(data)
  }

  // Récupère le match pour édition
  const fetchMatch = async () => {
    if (!matchId || matchId === 'new') {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()
    if (error) {
      console.error(error)
      setErrorMsg('Impossible de charger le match.')
    }
    if (data) {
      setTeamSelected(data.team_id)
      setOpponent(data.opponent)
      setMatchDate(data.match_date)
      setMatchTime(data.match_time)
      setLocationType(data.location_type === 'Domicile' ? 'Domicile' : 'Extérieur')
      setClubaddress(data.clubaddress || '')
      setCompositionValidated(data.composition_validated)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchTeams()
    fetchMatch()
  }, [matchId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    // Récupérer session utilisateur pour created_by
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
    if (sessionError) {
      setErrorMsg('Erreur lors de la récupération de la session.')
      return
    }
    const user = sessionData?.session?.user
    if (!user) {
      setErrorMsg('Utilisateur non connecté.')
      return
    }

    // Prépare payload
    const payload: any = {
      team_id: teamSelected,
      opponent,
      match_date: matchDate,
      match_time: matchTime,
      location_type: locationType,   // toujours 'Domicile' ou 'Extérieur'
      clubaddress,
      composition_validated: compositionValidated,
      updated_at: new Date().toISOString(),
    }

    // Insert ou update selon le cas
    try {
      if (!matchId || matchId === 'new') {
        payload.created_by = user.id // obligatoire pour NOT NULL
        const { error } = await supabase.from('matches').insert(payload)
        if (error) throw error
      } else {
        const { error } = await supabase.from('matches').update(payload).eq('id', matchId)
        if (error) throw error
      }
      onSaved()
    } catch (err: any) {
      console.error(err)
      setErrorMsg(err.message || 'Erreur lors de l’enregistrement du match.')
    }
  }

  if (loading) return <div>Chargement...</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && <div className="text-red-500 font-bold">{errorMsg}</div>}

      <div>
        <label className="block mb-1">Équipe</label>
        <select
          value={teamSelected}
          onChange={e => setTeamSelected(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
          required
        >
          <option value="">-- Sélectionnez une équipe --</option>
          {teams.map(t => (
            <option key={t.id} value={t.id}>{t.name}</option>
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
          required
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
            required
          />
        </div>
        <div>
          <label className="block mb-1">Heure</label>
          <input
            type="time"
            value={matchTime}
            onChange={e => setMatchTime(e.target.value)}
            className="w-full p-2 rounded bg-gray-700 text-white"
            required
          />
        </div>
      </div>

      <div>
        <label className="block mb-1">Lieu</label>
        <select
          value={locationType}
          onChange={e => setLocationType(e.target.value as 'Domicile' | 'Extérieur')}
          className="w-full p-2 rounded bg-gray-700 text-white"
          required
        >
          <option value="Domicile">Domicile</option>
          <option value="Extérieur">Extérieur</option>
        </select>
      </div>

      <div>
        <label className="block mb-1">Adresse du club (optionnel)</label>
        <input
          type="text"
          value={clubaddress}
          onChange={e => setClubaddress(e.target.value)}
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
