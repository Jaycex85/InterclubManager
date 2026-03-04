'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import { supabase } from '../../../../utils/supabaseClient'

type User = {
  id: string
  email: string
  role: 'admin' | 'club_admin' | 'player' | 'captain'
  auth_id: string
  created_at: string
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Vérifie que l'utilisateur est admin
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) return router.push('/auth')

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', data.user.id)
        .single()

      if (profile?.role !== 'admin') router.push('/auth')
    }
    checkUser()
  }, [router])

  // Récupère la liste des users
  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('email')
    if (error) console.error('Error fetching users:', error)
    else setUsers(data)
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('Voulez-vous vraiment supprimer cet utilisateur ?')) return
    const { error } = await supabase.from('users').delete().eq('id', id)
    if (error) alert(error.message)
    else fetchUsers()
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Gestion des Utilisateurs</h1>
        <button
          onClick={() => router.push('/dashboard/admin/users/new')}
          className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
        >
          Ajouter un utilisateur
        </button>
      </div>

      {loading ? (
        <p>Chargement des utilisateurs...</p>
      ) : users.length === 0 ? (
        <p>Aucun utilisateur pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {users.map((user) => (
            <li
              key={user.id}
              className="p-4 bg-gray-800 rounded shadow flex justify-between items-center"
            >
              <div>
                <p className="font-bold text-lg">{user.email}</p>
                <p className="text-gray-400 text-sm">{user.role}</p>
              </div>
              <div className="flex gap-2">
                <button
                  className="bg-yellow-500 text-black px-3 py-1 rounded hover:bg-yellow-600"
                  onClick={() => router.push(`/dashboard/admin/users/${user.id}`)}
                >
                  Voir / Éditer
                </button>
                <button
                  className="bg-red-600 text-white px-3 py-1 rounded hover:bg-red-700"
                  onClick={() => handleDelete(user.id)}
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
