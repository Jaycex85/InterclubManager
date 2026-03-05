'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type MatchFormProps = {
  matchId?: string         // pour l'édition
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
  const [clubAdress, setClubAdress] = useState('')
  const [compositionValidated, setCompositionValidated] = useState(false)
  const [loading, setLoading] = useState(true)
  const [errorMsg, setErrorMsg] = useState('')

  // ✅ Récupérer les équipes du capitaine seulement
  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('team_memberships')
      .select(`team_id, teams(id, name)`)
      .eq('user_id', supabase.auth.getUser()?.data.user?.id)
      .eq('role', 'captain')

    if (error) {
      console.error("Erreur fetchTeams:", error)
      setErrorMsg(error.message)
      return
    }

    if (data) {
      const formattedTeams = data.map((t: any) => ({
        id: t.team_id,
        name: t.teams.name
      }))
      setTeams(formattedTeams)
      if (!teamSelected && formattedTeams.length === 1) {
        setTeamSelected(formattedTeams[0].id)
      }
    }
  }

  // ✅ Fetch match si on édite
  const fetchMatch = async () => {
    if (!matchId) {
      setLoading(false)
      return
    }
    const { data, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .single()

    if (error) {
      console.error("Erreur fetchMatch:", error)
      setErrorMsg(error.message)
    } else if (data) {
      setTeamSelected(data.team_id)
      setOpponent(data.opponent)
      setMatchDate(data.match_date)
      setMatchTime(data.match_time)
      setLocationType(data.location_type)
      setClubAdress(data.clubadress || '')
      setCompositionValidated(data.composition_validated)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchTeams()
    fetchMatch()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [matchId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMsg('')

    if (!teamSelected) {
      setErrorMsg("Veuillez sélectionner une équipe.")
      return
    }

    const payload = {
      team_id: teamSelected,
      opponent,
      match_date: matchDate,
      match_time: matchTime,
      location_type: locationType,
      clubadress: clubAdress || null,
      composition_validated: compositionValidated,
      updated_at: new Date().toISOString()
    }

    try {
      let res
      if (matchId) {
        res = await supabase.from('matches').update(payload).eq('id', matchId)
      } else {
        res = await supabase.from('matches').insert(payload)
      }

      if (res.error) {
        console.error("Erreur insert/update match:", res.error)
        setErrorMsg(res.error.message)
        return
      }

      onSaved()
    } catch (err: any) {
      console.error("Erreur inattendue:", err)
      setErrorMsg(err.message || 'Erreur inconnue')
    }
  }

  if (loading) return <div>Chargement...</div>

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {errorMsg && (
        <div className="bg-red-600 text-white p-2 rounded">{errorMsg}</div>
      )}

      <div>
        <label className="block mb-1">Équipe</label>
        <select
          value={teamSelected}
          onChange={e => setTeamSelected(e.target.value)}
          className="w-full p-2 rounded bg-gray-700 text-white"
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
        <label className="block mb-1">Adresse du club (optionnel)</label>
        <input
          type="text"
          value={clubAdress}
          onChange={e => setClubAdress(e.target.value)}
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
