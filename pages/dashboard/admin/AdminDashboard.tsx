'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { FaUsers, FaFutbol, FaUser } from 'react-icons/fa' // Font Awesome icons

// Formulaires dynamiques
const ClubForm = dynamic(() => import('./clubs/EditClub'), { ssr: false })
const TeamForm = dynamic(() => import('./teams/EditTeam'), { ssr: false })
const EditUser = dynamic(() => import('./users/EditUser'), { ssr: false })

type PanelKey = 'clubs' | 'teams' | 'users'

type Club = { id: string; name: string; city?: string }
type Team = { id: string; name: string; club_id: string; club_name?: string; category?: string }
type User = { id: string; email: string; first_name?: string; last_name?: string }

export default function AdminDashboard() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [openModal, setOpenModal] = useState<{ type: PanelKey; id: string } | null>(null)

  /** FETCH FUNCTIONS */
  const fetchClubs = async () => {
    const { data, error } = await supabase.from('clubs').select('*').order('name')
    if (!error) setClubs(data || [])
  }

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`id, name, club_id, category, club:club_id(name)`)
      .order('name')
    if (!error)
      setTeams(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          club_id: t.club_id,
          club_name: t.club?.name || '',
          category: t.category,
        }))
      )
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('last_name, first_name')
    if (!error) setUsers(data || [])
  }

  useEffect(() => {
    fetchClubs()
    fetchTeams()
    fetchUsers()
  }, [])

  const panels: { key: PanelKey; label: string; icon: JSX.Element; items: { id: string; title: string }[] }[] = [
    {
      key: 'clubs',
      label: 'Clubs',
      icon: <FaFutbol className="w-6 h-6 mr-2" />,
      items: clubs.map(c => ({ id: c.id, title: c.city ? `${c.name} - ${c.city}` : c.name })),
    },
    {
      key: 'teams',
      label: 'Teams',
      icon: <FaUsers className="w-6 h-6 mr-2" />,
      items: teams.map(t => ({ id: t.id, title: `${t.name} - ${t.club_name}${t.category ? ` - ${t.category}` : ''}` })),
    },
    {
      key: 'users',
      label: 'Users',
      icon: <FaUser className="w-6 h-6 mr-2" />,
      items: users.map(u => {
        const fullName = [u.last_name, u.first_name].filter(Boolean).join(' ').trim()
        return { id: u.id, title: fullName ? `${fullName} - ${u.email}` : u.email }
      }),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6">Admin Dashboard</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {panels.map(panel => (
          <div
            key={panel.key}
            className="bg-gray-800 p-6 rounded-lg shadow-lg flex flex-col items-center justify-center cursor-pointer hover:bg-gray-700 transition-all duration-300"
            onClick={() => setOpenModal({ type: panel.key, id: '' })}
          >
            <div className="text-yellow-400">{panel.icon}</div>
            <h2 className="mt-4 text-xl font-bold">{panel.label}</h2>
            <p className="mt-2 text-gray-300">{panel.items.length} éléments</p>
          </div>
        ))}
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-800 p-6 rounded-lg shadow-lg w-full max-w-2xl transform transition-transform duration-300 scale-95 animate-fade-in">
            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenModal(null)}
            >
              Fermer ✕
            </button>

            {openModal.type === 'clubs' && (
              <div className="space-y-2">
                {clubs.map(c => (
                  <button
                    key={c.id}
                    className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded"
                    onClick={() => setOpenModal({ type: 'clubs', id: c.id })}
                  >
                    {c.city ? `${c.name} - ${c.city}` : c.name}
                  </button>
                ))}
                {openModal.id && (
                  <ClubForm
                    clubId={openModal.id}
                    onSaved={() => { fetchClubs(); setOpenModal(null) }}
                    onClose={() => setOpenModal(null)}
                  />
                )}
              </div>
            )}

            {openModal.type === 'teams' && (
              <div className="space-y-2">
                {teams.map(t => (
                  <button
                    key={t.id}
                    className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded"
                    onClick={() => setOpenModal({ type: 'teams', id: t.id })}
                  >
                    {t.name} - {t.club_name}{t.category ? ` - ${t.category}` : ''}
                  </button>
                ))}
                {openModal.id && (
                  <TeamForm
                    teamId={openModal.id}
                    onSaved={() => { fetchTeams(); setOpenModal(null) }}
                    onClose={() => setOpenModal(null)}
                  />
                )}
              </div>
            )}

            {openModal.type === 'users' && (
              <div className="space-y-2">
                {users.map(u => {
                  const fullName = [u.last_name, u.first_name].filter(Boolean).join(' ').trim()
                  const label = fullName ? `${fullName} - ${u.email}` : u.email
                  return (
                    <button
                      key={u.id}
                      className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded"
                      onClick={() => setOpenModal({ type: 'users', id: u.id })}
                    >
                      {label}
                    </button>
                  )
                })}
                {openModal.id && (
                  <EditUser
                    userId={openModal.id}
                    onSaved={() => { fetchUsers(); setOpenModal(null) }}
                    onClose={() => setOpenModal(null)}
                  />
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <style jsx>{`
        .animate-fade-in {
          animation: fadeIn 0.2s ease-out forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>
    </div>
  )
}
