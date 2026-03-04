'use client'

import { useEffect, useRef, useState } from 'react'
import EditUser, { EditUserProps } from './EditUser'
import { supabase } from '../../../../utils/supabaseClient'

type User = {
  id: string
  email: string
}

export default function UsersDashboard() {
  const [users, setUsers] = useState<User[]>([])
  const [openUserId, setOpenUserId] = useState<string | null>(null)
  const containerRefs = useRef<{ [key: string]: HTMLDivElement | null }>({})

  const fetchUsers = async () => {
    const { data } = await supabase.from('users').select('id, email')
    if (data) setUsers(data)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  return (
    <div className="p-6 bg-gray-900 min-h-screen">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Utilisateurs</h1>

      <div className="space-y-4">
        {users.map(user => (
          <div key={user.id} className="border border-gray-700 rounded overflow-hidden">
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold"
              onClick={() => setOpenUserId(openUserId === user.id ? null : user.id)}
            >
              {user.email}
            </button>

            <div
              ref={el => { containerRefs.current[user.id] = el }}
              style={{
                overflow: 'hidden',
                maxHeight: openUserId === user.id ? containerRefs.current[user.id]?.scrollHeight : 0,
                transition: 'max-height 0.35s ease'
              }}
            >
              {openUserId === user.id && (
                <div className="p-4 bg-gray-700">
                  <EditUser
                    userId={user.id}
                    onSaved={() => {
                      fetchUsers()
                      setOpenUserId(null)
                    }}
                    onClose={() => setOpenUserId(null)}
                  />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
