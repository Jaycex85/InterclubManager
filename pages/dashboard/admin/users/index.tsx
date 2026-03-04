'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../utils/supabaseClient'
import dynamic from 'next/dynamic'
import type { EditUserProps } from './EditUser'

type User = { id: string; email: string; first_name?: string; last_name?: string }

const EditUser = dynamic<EditUserProps>(() => import('./EditUser'), { ssr: false })

function UserItem({ user, isOpen, onToggle, onSaved }: { user: User; isOpen: boolean; onToggle: () => void; onSaved: () => void }) {
  const [maxHeight, setMaxHeight] = useState('0px')
  const contentRef = (el: HTMLDivElement | null) => {
    if (el) setMaxHeight(`${el.scrollHeight}px`)
  }

  return (
    <li className="bg-gray-800 rounded shadow overflow-hidden">
      <button
        className="w-full text-left p-4 bg-gray-700 hover:bg-gray-600 font-bold flex justify-between items-center"
        onClick={onToggle}
      >
        <span>
          {user.email}
          {user.first_name ? ` - ${user.first_name} ${user.last_name || ''}` : ''}
        </span>
        <span className={`ml-2 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
          ▼
        </span>
      </button>

      <div className="transition-all duration-500 overflow-hidden" style={{ maxHeight: isOpen ? maxHeight : '0px' }}>
        {isOpen && (
          <div ref={contentRef} className="p-4 bg-gray-700">
            <EditUser
              userId={user.id}
              onSaved={onSaved}
              onClose={onToggle}
            />
          </div>
        )}
      </div>
    </li>
  )
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(false)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

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

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">Gestion des Utilisateurs</h1>
      {loading ? (
        <p>Chargement des utilisateurs...</p>
      ) : users.length === 0 ? (
        <p>Aucun utilisateur pour le moment.</p>
      ) : (
        <ul className="space-y-4">
          {users.map(user => (
            <UserItem
              key={user.id}
              user={user}
              isOpen={openUserId === user.id}
              onToggle={() => setOpenUserId(openUserId === user.id ? null : user.id)}
              onSaved={() => {
                fetchUsers()
                setOpenUserId(null)
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}
