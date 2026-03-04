'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type Club = {
  id?: string
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

export default function ClubFormPage() {
  const router = useRouter()
  const { id } = router.query

  const [club, setClub] = useState<Club>({
    name: '',
    address: null,
    city: null,
    zip_code: null,
    country: null,
    phone: null,
    email: null,
    website: null,
    logo_url: null,
  })

  const [loading, setLoading] = useState(false)

  // Récupérer le club existant si id !== "new"
  useEffect(() => {
    if (!id || id === 'new') return

    const fetchClub = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', id)
        .single()
      if (error) console.error('Error fetching club:', error)
      else if (data) setClub(data)
      setLoading(false)
    }

    fetchClub()
  }, [id])

  const handleChange = (field: keyof Club, value: string) => {
    setClub({ ...club, [field]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (id === 'new') {
      const { error } = await supabase.from('clubs').insert([club])
      if (error) alert(error.message)
      else router.push('/dashboard/admin/clubs')
    } else {
      const { error } = await supabase
        .from('clubs')
        .update(club)
        .eq('id', id)
      if (error) alert(error.message)
      else router.push('/dashboard/admin/clubs')
    }

    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        {id === 'new' ? 'Créer un club' : 'Éditer le club'}
      </h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block mb-1">Nom</label>
            <input
              type="text"
              value={club.name}
              onChange={(e) => handleChange('name', e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Adresse</label>
            <input
              type="text"
              value={club.address || ''}
              onChange={(e) => handleChange('address', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block mb-1">Ville</label>
              <input
                type="text"
                value={club.city || ''}
                onChange={(e) => handleChange('city', e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              />
            </div>
            <div>
              <label className="block mb-1">Code postal</label>
              <input
                type="text"
                value={club.zip_code || ''}
                onChange={(e) => handleChange('zip_code', e.target.value)}
                className="w-full p-2 rounded bg-gray-800 border border-gray-700"
              />
            </div>
          </div>

          <div>
            <label className="block mb-1">Pays</label>
            <input
              type="text"
              value={club.country || ''}
              onChange={(e) => handleChange('country', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Téléphone</label>
            <input
              type="text"
              value={club.phone || ''}
              onChange={(e) => handleChange('phone', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={club.email || ''}
              onChange={(e) => handleChange('email', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Site web</label>
            <input
              type="text"
              value={club.website || ''}
              onChange={(e) => handleChange('website', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Logo URL</label>
            <input
              type="text"
              value={club.logo_url || ''}
              onChange={(e) => handleChange('logo_url', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          >
            {id === 'new' ? 'Créer le club' : 'Mettre à jour'}
          </button>
        </form>
      )}
    </div>
  )
}
