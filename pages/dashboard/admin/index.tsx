'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../utils/supabaseClient'

export default function AdminDashboard() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.replace('/auth')
        return
      }

      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', session.user.id)
        .single()

      if (error || !profile) {
        router.replace('/auth')
        return
      }

      if (profile.role !== 'admin') {
        // Redirection si pas admin
        router.replace('/dashboard')
        return
      }

      setUserRole(profile.role)
      setLoading(false)
    }

    checkUser()
  }, [router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <p>Chargement du dashboard...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Dashboard Admin</h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
        <div
          className="bg-gray-800 p-6 rounded shadow hover:bg-gray-700 cursor-pointer"
          onClick={() => router.push('/dashboard/admin/clubs')}
        >
          <h2 className="text-xl font-bold mb-2">Clubs</h2>
          <p>Gérer tous les clubs de l’application.</p>
        </div>

        <div
          className="bg-gray-800 p-6 rounded shadow hover:bg-gray-700 cursor-pointer"
          onClick={() => router.push('/dashboard/admin/teams')}
        >
          <h2 className="text-xl font-bold mb-2">Équipes</h2>
          <p>Gérer toutes les équipes et leurs membres.</p>
        </div>

        <div
          className="bg-gray-800 p-6 rounded shadow hover:bg-gray-700 cursor-pointer"
          onClick={() => router.push('/dashboard/admin/players')}
        >
          <h2 className="text-xl font-bold mb-2">Joueurs</h2>
          <p>Gérer les joueurs inscrits et leur profil.</p>
        </div>

        {/* Tu peux ajouter d’autres sections ici, ex : tournois, matchs, etc. */}
      </div>
    </div>
  )
}
