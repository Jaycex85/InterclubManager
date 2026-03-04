'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import dynamic from 'next/dynamic'

const EditClub = dynamic(() => import('./EditClub'), { ssr: false })

type Club = { id: string; name: string; city: string | null }

function ClubItem({ club, isOpen, onToggle, onSaved }: { club: Club; isOpen: boolean; onToggle: () => void; onSaved: () => void }) {
  const [maxHeight, setMaxHeight] = useState('0px')
  const contentRef = (el: HTMLDivElement | null) => {
    if (el) setMaxHeight(`${el.scrollHeight}px`)
  }

  return (
    <li className="p-4 bg-gray-800 rounded shadow flex flex-col overflow-hidden">
      <div className="flex justify-between items-center">
        <div>
          <p className="font-bold text-lg">{club.name}</p>
          <p className="text-gray-400 text-sm">{club.city}</p>
        </div>
        <div className="flex gap-2">
          <button
            className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
            onClick={onToggle}
          >
            Voir / Éditer
          </button>
        </div>
      </div>

      <div className="transition-all duration-500 overflow-hidden" style={{ maxHeight: isOpen ? maxHeight : '0px' }}>
        {isOpen && (
          <div ref={contentRef} className="mt-4">
            <EditClub
              clubId={club.id}
              onSaved={onSaved}
              onClose={onToggle}
            />
          </div>
        )}
      </div>
    </li>
  )
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [openClubId, setOpenClubId] = useState<string | null>(null)

  const fetchClubs = async () => {
    setLoading(true)
    const { data } = await supabase.from('clubs').select('*').order('name')
    if (data) setClubs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Gestion des Clubs</h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {clubs.map(club => (
            <ClubItem
              key={club.id}
              club={club}
              isOpen={openClubId === club.id}
              onToggle={() => setOpenClubId(openClubId === club.id ? null : club.id)}
              onSaved={fetchClubs}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
