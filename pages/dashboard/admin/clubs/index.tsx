'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type Club = {
  id: string
  name: string
  address: string | null
  city: string | null
  zip_code: string | null
  country: string | null
  phone: string | null
  email: string | null
  website: string | null
  logo_url: string | null
}

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Vérifie que l'utilisateur est admin
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) {
        router.push('/auth')
        return
      }

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', data.user.id)
        .single()
      if (profile?.role !== 'admin') router.push('/auth')
    }
    checkUser()
  }, [router])

  // Récupère la liste des clubs
  const fetchClubs = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('clubs').select('*').order('name')
    if (error) console.error('Error fetching clubs:', error)
    else setClubs(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchClubs()
  }, [])

  // Supprimer un club
  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer ce club ?')) return
    const { error } = await supabase.from('clubs').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchClubs()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Gestion des Clubs</h1>
        <button
          onClick={() => router.push('/dashboard/admin/clubs/new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter un club
        </button>
      </div>

      {loading ? (
        <p>Chargement des clubs...</p>
      ) : clubs.length === 0 ? (
        <p>Aucun club pour le moment.</p>
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
                  onClick={() => router.push(`/dashboard/admin/clubs/${club.id}`)}
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
    </div>
  )
}
