'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import EditClub from './EditClub'

type Club = {
  id: string
  name: string
  city: string | null
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedClubId, setSelectedClubId] = useState<string | null>(null)

  const fetchClubs = async () => {
    setLoading(true)
    const { data } = await supabase.from('clubs').select('*').order('name')
    if (data) setClubs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce club ?')) return
    await supabase.from('clubs').delete().eq('id', id)
    fetchClubs()
  }

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">
          Gestion des Clubs
        </h1>

        <button
          onClick={() => setSelectedClubId('new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter un club
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {clubs.map((club) => (
            <li
              key={club.id}
              className="p-4 bg-gray-800 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-lg">{club.name}</p>
                <p className="text-gray-400 text-sm">{club.city}</p>
              </div>

              <div className="flex gap-2">
                <button
                  className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
                  onClick={() => setSelectedClubId(club.id)}
                >
                  Voir / Éditer
                </button>

                <button
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  onClick={() => handleDelete(club.id)}
                >
                  Supprimer
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {selectedClubId && (
        <EditClub
          clubId={selectedClubId}
          onClose={() => setSelectedClubId(null)}
          onSaved={fetchClubs}
        />
      )}
    </div>
  )
}
