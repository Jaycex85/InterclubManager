'use client'

import { useEffect, useRef, useState } from 'react'
import EditClub from './EditClub'
import { supabase } from '../../../../utils/supabaseClient'

type Club = {
  id: string
  name: string
}

export default function ClubsDashboard() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [openClubId, setOpenClubId] = useState<string | null>(null)
  const [addingClub, setAddingClub] = useState(false)
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const fetchClubs = async () => {
    const { data } = await supabase.from('clubs').select('id, name')
    if (data) setClubs(data)
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  // Animation ouverture club
  useEffect(() => {
    if (openClubId && containerRefs.current[openClubId]) {
      const el = containerRefs.current[openClubId]!
      setTimeout(() => {
        el.style.maxHeight = el.scrollHeight + 'px'
      }, 0)
    }
  }, [openClubId])

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Clubs</h1>

      {/* Bouton Ajouter */}
      <div className="mb-6">
        <button
          onClick={() => setAddingClub(true)}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          + Ajouter un club
        </button>
      </div>

      {/* Liste des clubs */}
      <div className="space-y-4">
        {clubs.map(club => (
          <div key={club.id} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenClubId(openClubId === club.id ? null : club.id)}
            >
              {club.name}
            </button>

            <div
              ref={el => { containerRefs.current[club.id] = el }}
              style={{
                overflow: 'hidden',
                maxHeight: openClubId === club.id ? undefined : '0px',
                transition: 'max-height 0.35s ease'
              }}
            >
              {openClubId === club.id && (
                <div className="p-4 bg-gray-700">
                  <EditClub
                    clubId={club.id}
                    onSaved={() => {
                      fetchClubs()
                      setOpenClubId(null)
                    }}
                    onClose={() => setOpenClubId(null)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Modal Ajouter un club */}
      {addingClub && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <EditClub
            clubId="new"
            onClose={() => setAddingClub(false)}
            onSaved={() => {
              fetchClubs()
              setAddingClub(false)
            }}
          />
        </div>
      )}
    </div>
  )
}
