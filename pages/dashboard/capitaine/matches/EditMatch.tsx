import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type Props = {
  matchId?: string
  teamId: string
  teamName: string
  onSaved: () => void
  onClose: () => void
}

export default function MatchForm({ matchId, teamId, teamName, onSaved, onClose }: Props) {
  const [opponent, setOpponent] = useState('')
  const [matchDate, setMatchDate] = useState('')
  const [matchTime, setMatchTime] = useState('')
  const [locationType, setLocationType] = useState('')
  const [clubAddress, setClubAddress] = useState('')
  const [loading, setLoading] = useState(false)

  // Pré-remplissage si édition
  useEffect(() => {
    if (!matchId) return

    const fetchMatch = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('matches')
        .select('*')
        .eq('id', matchId)
        .single()

      if (error) console.error(error)
      else if (data) {
        setOpponent(data.opponent || '')
        setMatchDate(data.match_date || '')
        setMatchTime(data.match_time || '')
        setLocationType(data.location_type || '')
        setClubAddress(data.clubaddress || '')
      }

      setLoading(false)
    }

    fetchMatch()
  }, [matchId])

  const handleSave = async () => {
  setLoading(true)

  const { data: { user } } = await supabase.auth.getUser()

  const { error } = await supabase
    .from('matches')
    .upsert({
      id: matchId,
      team_id: teamId,
      opponent,
      match_date: matchDate,
      match_time: matchTime,
      location_type: locationType,
      clubaddress: clubAddress,
      created_by: user?.id
    })

  if (error) console.error(error)
  else onSaved()

  setLoading(false)
}

  return (
    <div>
      

      {loading ? (
        <p className="text-gray-300">Chargement...</p>
      ) : (
        <>
          <input
            type="text"
            placeholder="Adversaire"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            className="mb-2 w-full p-2 rounded bg-gray-700 text-white"
          />

          <input
            type="date"
            value={matchDate}
            onChange={(e) => setMatchDate(e.target.value)}
            className="mb-2 w-full p-2 rounded bg-gray-700 text-white"
          />

          <input
            type="time"
            value={matchTime}
            onChange={(e) => setMatchTime(e.target.value)}
            className="mb-2 w-full p-2 rounded bg-gray-700 text-white"
          />

          <select
  value={locationType}
  onChange={(e) => setLocationType(e.target.value)}
  className="mb-2 w-full p-2 rounded bg-gray-700 text-white"
>
  <option value="">Type de lieu</option>
  <option value="Domicile">Domicile</option>
  <option value="Extérieur">Extérieur</option>
</select>

          <input
            type="text"
            placeholder="Adresse du club"
            value={clubAddress}
            onChange={(e) => setClubAddress(e.target.value)}
            className="mb-2 w-full p-2 rounded bg-gray-700 text-white"
          />

          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded text-white font-semibold"
            >
              Annuler
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-green-600 hover:bg-green-500 rounded text-white font-semibold"
            >
              Sauvegarder
            </button>
          </div>
        </>
      )}
    </div>
  )
}
