'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import EditClub from './EditClub'

type Club = { id: string; name: string; city: string | null }

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [openClubId, setOpenClubId] = useState<string | null>(null)
  const containerRefs = useRef<Record<string, HTMLDivElement | null>>({})

  const fetchClubs = async () => {
    setLoading(true)
    const { data } = await supabase.from('clubs').select('*').order('name')
    if (data) setClubs(data)
    setLoading(false)
  }

  useEffect(() => { fetchClubs() }, [])

  const toggleClubForm = (clubId: string) => {
    setOpenClubId(prev => (prev === clubId ? null : clubId))
  }

  useEffect(() => {
    if (openClubId && containerRefs.current[openClubId]) {
      const el = containerRefs.current[openClubId]
      el!.style.maxHeight = el!.scrollHeight + 'px'
    }
  }, [openClubId])

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Gestion des Clubs</h1>

      {loading ? <p>Chargement...</p> : (
        <ul className="space-y-4">
          {clubs.map(club => (
            <li key={club.id} className="bg-gray-800 rounded shadow overflow-hidden">
              <button
                className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 font-bold flex justify-between items-center"
                onClick={() => toggleClubForm(club.id)}
              >
                <span>{club.name} {club.city ? `- ${club.city}` : ''}</span>
                <span className={`ml-2 transform transition-transform duration-300 ${openClubId === club.id ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              <div
                ref={el => (containerRefs.current[club.id] = el)}
                style={{ overflow: 'hidden', maxHeight: openClubId === club.id ? undefined : 0, transition: 'max-height 0.35s ease' }}
              >
                {openClubId === club.id && (
                  <div className="p-4 bg-gray-700">
                    <EditClub
                      clubId={club.id}
                      onSaved={() => { fetchClubs(); setOpenClubId(null) }}
                      onClose={() => setOpenClubId(null)}
                    />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
