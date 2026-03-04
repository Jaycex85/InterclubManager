'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import dynamic from 'next/dynamic'
import type { EditUserProps } from './EditUser'

type User = {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

// Import dynamique
const EditUser = dynamic<EditUserProps>(() => import('./EditUser'), { ssr: false })

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) window.location.href = '/auth'

      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('auth_id', data.user.id)
        .single()

      if (error || profile?.role !== 'admin') window.location.href = '/auth'
    }
    checkAdmin()
  }, [])

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase.from('users').select('*').order('email')
    if (error) console.error(error)
    else setUsers(data || [])
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleUserForm = (userId: string) => {
    setOpenUserId((prev) => (prev === userId ? null : userId))
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Gestion des Utilisateurs</h1>

      {loading ? (
        <p>Chargement des utilisateurs...</p>
      ) : users.length === 0 ? (
        <p>Aucun utilisateur pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {users.map((user) => (
            <li key={user.id} className="bg-gray-800 rounded shadow overflow-hidden">
              <button
                className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 font-bold flex justify-between items-center"
                onClick={() => toggleUserForm(user.id)}
              >
                <span>
                  {user.email}
                  {user.first_name ? ` - ${user.first_name} ${user.last_name || ''}` : ''}
                </span>
                <span
                  className={`ml-2 transform transition-transform duration-300 ${
                    openUserId === user.id ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              <div
                className={`transition-all duration-500 overflow-hidden ${
                  openUserId === user.id ? 'max-h-[2000px]' : 'max-h-0'
                }`}
              >
                {openUserId === user.id && (
                  <div className="p-4 bg-gray-700">
                    <EditUser
                      userId={user.id}
                      onSaved={() => {
                        fetchUsers()
                        setOpenUserId(null)
                      }}
                      onClose={() => setOpenUserId(null)} // <-- ajouté pour build
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
