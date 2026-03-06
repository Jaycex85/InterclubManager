'use client'

import { useState, useEffect } from 'react'
import { supabase } from '../../../../utils/supabaseClient'

type Props = {
  matchId: string
  onSaved: () => void
  onClose: () => void
}

type Player = {
  user_id: string
  email: string
  first_name?: string
  last_name?: string
  status: 'available' | 'maybe' | 'unavailable'
  selection_status: 'selected' | 'not_selected'
}

export default function EditComposition({ matchId, onSaved, onClose }: Props) {
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  // Fetch players + availability
  const fetchPlayers = async () => {
    setLoading(true)

    const { data, error } = await supabase
      .from('availability')
      .select(`
        user_id,
        status,
        selection_status,
        users(id, email, first_name, last_name)
      `)
      .eq('match_id', matchId)

    if (error) {
      console.error(error)
      setLoading(false)
      return
    }

    if (data) {
      const formatted = data.map((p: any) => ({
        user_id: p.user_id,
        email: p.users.email,
        first_name: p.users.first_name,
        last_name: p.users.last_name,
        status: p.status,
        selection_status: p.selection_status || 'not_selected'
      }))
      setPlayers(formatted)
    }

    setLoading(false)
  }

  useEffect(() => {
    fetchPlayers()
  }, [matchId])

  const toggleSelection = (userId: string) => {
    setPlayers(prev =>
      prev.map(p =>
        p.user_id === userId
          ? {
              ...p,
              selection_status: p.selection_status === 'selected' ? 'not_selected' : 'selected'
            }
          : p
      )
    )
  }

  const handleSave = async () => {
    setSaving(true)
    const updates = players.map(p =>
      supabase
        .from('availability')
        .update({ selection_status: p.selection_status })
        .eq('match_id', matchId)
        .eq('user_id', p.user_id)
    )
    await Promise.all(updates)
    setSaving(false)
    onSaved()
  }

  if (loading) return <div className="text-white p-4">Chargement des joueurs...</div>

  return (
    <div className="p-4 bg-gray-900 text-white rounded max-h-[80vh] overflow-y-auto">
      <h2 className="text-xl font-bold mb-4">Composition du match</h2>

      <div className="space-y-2">
        {players.map(p => {
          const fullName = [p.first_name, p.last_name].filter(Boolean).join(' ').trim()
          const label = fullName ? `${fullName} - ${p.email}` : p.email
          const isAvailable = p.status === 'available'
          const selected = p.selection_status === 'selected'

          return (
            <div
              key={p.user_id}
              className={`flex justify-between items-center p-2 rounded ${
                selected
                  ? 'bg-green-700 hover:bg-green-600'
                  : isAvailable
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-800 opacity-50 cursor-not-allowed'
              }`}
            >
              <span>{label} ({p.status})</span>
              {isAvailable && (
                <button
                  className={`px-3 py-1 rounded font-bold ${
                    selected ? 'bg-yellow-500 hover:bg-yellow-600 text-black' : 'bg-gray-600 hover:bg-gray-500 text-white'
                  }`}
                  onClick={() => toggleSelection(p.user_id)}
                >
                  {selected ? 'Retirer' : 'Sélectionner'}
                </button>
              )}
            </div>
          )
        })}
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <button
          className="px-4 py-2 bg-gray-600 hover:bg-gray-500 rounded"
          onClick={onClose}
        >
          Fermer
        </button>
        <button
          className={`px-4 py-2 rounded font-bold ${saving ? 'bg-gray-500' : 'bg-yellow-500 hover:bg-yellow-600 text-black'}`}
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </button>
      </div>
    </div>
  )
}
