'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import EditClub from './EditClub'

type Club = { id: string; name: string; city: string | null }

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const [openClubId, setOpenClubId] = useState<string | null>(null)

  // slide-down hook
  const useSlideDown = (isOpen: boolean) => {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState('0px')

    useEffect(() => {
      if (ref.current) {
        setTimeout(() => {
          setHeight(isOpen ? `${ref.current!.scrollHeight}px` : '0px')
        }, 0)
      }
    }, [isOpen, ref.current?.scrollHeight])

    return { ref, style: { maxHeight: height, overflow: 'hidden', transition: 'max-height 0.35s ease' } }
  }

  const fetchClubs = async () => {
    setLoading(true)
    const { data } = await supabase.from('clubs').select('*').order('name')
    if (data) setClubs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  const toggleClub = (id: string) => {
    setOpenClubId(prev => (prev === id ? null : id))
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Supprimer ce club ?')) return
    await supabase.from('clubs').delete().eq('id', id)
    fetchClubs()
  }

  return (
    <div className="bg-gray-900 text-gray-100 p-6 rounded min-h-screen">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Gestion des Clubs</h1>
        <button
          onClick={() => setOpenClubId('new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter un club
        </button>
      </div>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <ul className="space-y-4">
          {clubs.map(club => {
            const { ref, style } = useSlideDown(openClubId === club.id)
            return (
              <li key={club.id} className="bg-gray-800 rounded shadow">
                <div className="flex justify-between items-center p-4 bg-gray-700 hover:bg-gray-600 cursor-pointer">
                  <div onClick={() => toggleClub(club.id)}>
                    <p className="font-bold text-lg">{club.name}</p>
                    <p className="text-gray-400 text-sm">{club.city}</p>
                  </div>
                  <span
                    className={`ml-2 transform transition-transform duration-300 ${
                      openClubId === club.id ? 'rotate-180' : ''
                    }`}
                    onClick={() => toggleClub(club.id)}
                  >
                    ▼
                  </span>
                </div>

                <div ref={ref} style={style} className="p-4 bg-gray-600">
                  {openClubId === club.id && (
                    <EditClub
                      clubId={club.id}
                      onSaved={fetchClubs}
                      onClose={() => setOpenClubId(null)}
                    />
                  )}
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
