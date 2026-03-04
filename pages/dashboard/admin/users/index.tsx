'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../../utils/supabaseClient'

type User = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  clubs?: ClubMembership[]
}

type ClubMembership = {
  id: string
  club_id: string
  club_name: string
  role: 'club_admin' | 'player'
}

const UserForm = dynamic(() => import('./[id]'), { ssr: false })

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    // On récupère les users et leurs club_memberships
    const { data: usersData, error: userError } = await supabase
      .from('users')
      .select(`
        id,
        email,
        first_name,
        last_name,
        club_memberships (
          id,
          club_id,
          role,
          club:club_id(name)
        )
      `)
      .order('email')

    if (userError) console.error('Erreur fetch users:', userError)
    else if (usersData) {
      // On reformate pour inclure le nom du club directement
      const formattedUsers: User[] = (usersData as any).map((u: any) => ({
        id: u.id,
        email: u.email,
        first_name: u.first_name,
        last_name: u.last_name,
        clubs: (u.club_memberships || []).map((cm: any) => ({
          id: cm.id,
          club_id: cm.club_id,
          club_name: cm.club?.name || '',
          role: cm.role
        }))
      }))
      setUsers(formattedUsers)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const toggleUser = (id: string) => {
    setOpenUserId(openUserId === id ? null : id)
  }

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
          onClick={() => setOpenUserId('new')}
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
          {users.map(user => (
            <li key={user.id} className="bg-gray-800 rounded shadow overflow-hidden">
              <button
                className="w-full text-left p-4 flex justify-between items-center bg-gray-800 hover:bg-gray-700 font-bold"
                onClick={() => toggleUser(user.id)}
              >
                <div>
                  <p className="text-lg">
                    {user.first_name || user.last_name
                      ? `${user.first_name ?? ''} ${user.last_name ?? ''}`
                      : user.email}
                  </p>
                  {(user.first_name || user.last_name) && (
                    <p className="text-gray-400 text-sm">{user.email}</p>
                  )}
                  {user.clubs && user.clubs.length > 0 && (
                    <p className="text-gray-300 text-sm mt-1">
                      {user.clubs.map(c => `${c.club_name} (${c.role})`).join(' | ')}
                    </p>
                  )}
                </div>
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
                    <UserForm
                      userId={user.id}
                      onSaved={() => {
                        fetchUsers()
                        setOpenUserId(null)
                      }}
                    />
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="mt-2 bg-red-600 hover:bg-red-700 px-3 py-1 rounded font-bold"
                    >
                      Supprimer
                    </button>
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Formulaire pour nouvel utilisateur */}
      {openUserId === 'new' && (
        <div className="mt-6 p-4 bg-gray-800 rounded shadow">
          <UserForm
            userId="new"
            onSaved={() => {
              fetchUsers()
              setOpenUserId(null)
            }}
          />
        </div>
      )}
    </div>
  )
}
