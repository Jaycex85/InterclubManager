'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../utils/supabaseClient'

type Club = {
  id?: string
  name: string
  address?: string | null
  city?: string | null
  zip_code?: string | null
  country?: string | null
  phone?: string | null
  email?: string | null
  website?: string | null
  logo_url?: string | null
}

export default function ClubFormPage() {
  const router = useRouter()
  const { id } = router.query

  const [club, setClub] = useState<Club>({
    name: '',
    address: '',
    city: '',
    zip_code: '',
    country: '',
    phone: '',
    email: '',
    website: '',
    logo_url: '',
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Charge les données si on édite un club existant
  useEffect(() => {
    if (!id || id === 'new') return

    const fetchClub = async () => {
      setLoading(true)
      const { data, error } = await supabase.from('clubs').select('*').eq('id', id).single()
      if (error) setError(error.message)
      else if (data) setClub(data)
      setLoading(false)
    }

    fetchClub()
  }, [id])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setClub({ ...club, [e.target.name]: e.target.value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    try {
      if (id === 'new') {
        const { error } = await supabase.from('clubs').insert([club])
        if (error) throw error
      } else {
        const { error } = await supabase.from('clubs').update(club).eq('id', id)
        if (error) throw error
      }
      router.push('/dashboard/admin/clubs')
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        {id === 'new' ? 'Créer un club' : 'Éditer le club'}
      </h1>

      {error && <p className="text-red-400 mb-4">{error}</p>}

      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <input
          type="text"
          name="name"
          placeholder="Nom du club"
          value={club.name}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
          required
        />
        <input
          type="text"
          name="address"
          placeholder="Adresse"
          value={club.address || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />
        <input
          type="text"
          name="city"
          placeholder="Ville"
          value={club.city || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />
        <input
          type="text"
          name="zip_code"
          placeholder="Code postal"
          value={club.zip_code || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />
        <input
          type="text"
          name="country"
          placeholder="Pays"
          value={club.country || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />
        <input
          type="text"
          name="phone"
          placeholder="Téléphone"
          value={club.phone || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={club.email || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />
        <input
          type="text"
          name="website"
          placeholder="Site web"
          value={club.website || ''}
          onChange={handleChange}
          className="w-full p-2 rounded text-black"
        />

        <button
          type="submit"
          className="w-full bg-yellow-500 text-black p-2 rounded hover:bg-yellow-600"
          disabled={loading}
        >
          {loading ? 'Chargement...' : id === 'new' ? 'Créer le club' : 'Mettre à jour'}
        </button>
      </form>
    </div>
  )
}
