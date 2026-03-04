'use client'

import { useEffect, useState } from 'react'
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

type Props = {
  clubId: string | null
  onClose: () => void
  onSaved: () => void
}

export default function EditClub({ clubId, onClose, onSaved }: Props) {
  const isNew = clubId === 'new'

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

  useEffect(() => {
    if (!clubId || clubId === 'new') return

    const fetchClub = async () => {
      setLoading(true)
      const { data, error } = await supabase
        .from('clubs')
        .select('*')
        .eq('id', clubId)
        .single()

      if (!error && data) setClub(data)
      setLoading(false)
    }

    fetchClub()
  }, [clubId])

  const handleChange = (field: keyof Club, value: string) => {
    setClub({ ...club, [field]: value })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (isNew) {
      await supabase.from('clubs').insert([club])
    } else {
      await supabase.from('clubs').update(club).eq('id', clubId)
    }

    setLoading(false)
    onSaved()
    onClose()
  }

  return (
    <div className="mt-6 p-6 bg-gray-800 rounded shadow">
      <h2 className="text-2xl font-bold text-yellow-400 mb-4">
        {isNew ? 'Créer un club' : 'Éditer le club'}
      </h2>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <input
            type="text"
            placeholder="Nom"
            value={club.name}
            onChange={(e) => handleChange('name', e.target.value)}
            required
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Adresse"
            value={club.address || ''}
            onChange={(e) => handleChange('address', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Ville"
            value={club.city || ''}
            onChange={(e) => handleChange('city', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Code postal"
            value={club.zip_code || ''}
            onChange={(e) => handleChange('zip_code', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Pays"
            value={club.country || ''}
            onChange={(e) => handleChange('country', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Téléphone"
            value={club.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="email"
            placeholder="Email"
            value={club.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Site web"
            value={club.website || ''}
            onChange={(e) => handleChange('website', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <input
            type="text"
            placeholder="Logo URL"
            value={club.logo_url || ''}
            onChange={(e) => handleChange('logo_url', e.target.value)}
            className="w-full p-2 rounded bg-gray-900 border border-gray-700"
          />

          <div className="flex gap-3">
            <button
              type="submit"
              className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
            >
              {isNew ? 'Créer' : 'Mettre à jour'}
            </button>

            <button
              type="button"
              onClick={onClose}
              className="bg-gray-600 hover:bg-gray-700 px-4 py-2 rounded"
            >
              Annuler
            </button>
          </div>
        </form>
      )}
    </div>
  )
}
