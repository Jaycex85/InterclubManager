'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'

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

  const [openPanel, setOpenPanel] = useState<PanelKey | null>(null)
  const [openModal, setOpenModal] = useState<{ type: PanelKey; id: string } | null>(null)

  /** FETCH FUNCTIONS */
  const fetchClubs = async () => {
    const { data, error } = await supabase.from('clubs').select('*').order('name')
    if (!error) setClubs(data || [])
  }

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        club_id,
        category,
        club:club_id(name)
      `)
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
    const { data, error } = await supabase.from('users').select('*').order('email')
    if (!error) setUsers(data || [])
  }

  useEffect(() => {
    fetchClubs()
    fetchTeams()
    fetchUsers()
  }, [])

  /** PANELS DATA */
  const panels: { key: PanelKey; label: string; items: { id: string; title: string }[] }[] = [
    {
      key: 'clubs',
      label: 'Clubs',
      items: clubs.map(c => ({ id: c.id, title: c.city ? `${c.name} - ${c.city}` : c.name })),
    },
    {
      key: 'teams',
      label: 'Teams',
      items: teams.map(t => ({ id: t.id, title: `${t.name} - ${t.club_name}${t.category ? ` - ${t.category}` : ''}` })),
    },
    {
      key: 'users',
      label: 'Users',
      items: users.map(u => {
        const fullName = [u.last_name, u.first_name].filter(Boolean).join(' ').trim()
        return {
          id: u.id,
          title: fullName ? `${fullName} - ${u.email}` : u.email,
        }
      }),
    },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">Admin Dashboard</h1>

      <div className="space-y-4 md:space-y-6">
        {panels.map(panel => (
          <div
            key={panel.key}
            className="border border-gray-700 rounded overflow-hidden shadow-lg hover:shadow-xl transition-shadow"
          >
            {/* Panel header */}
            <button
              className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold flex justify-between items-center transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
              onClick={() => setOpenPanel(openPanel === panel.key ? null : panel.key)}
            >
              {panel.label}
              <span
                className={`ml-2 transform transition-transform duration-300 ${openPanel === panel.key ? 'rotate-180' : ''}`}
              >
                ▼
              </span>
            </button>

            {/* Panel items */}
            {openPanel === panel.key && (
              <div className="p-4 grid gap-2 max-h-96 overflow-y-auto">
                {panel.items.map(item => (
                  <button
                    key={item.id}
                    className="w-full text-left p-2 bg-gray-700 hover:bg-gray-600 rounded transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-400"
                    onClick={() => setOpenModal({ type: panel.key, id: item.id })}
                  >
                    {item.title}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {openModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-xl max-h-[90vh] overflow-y-auto relative">
            <button
              className="absolute top-4 right-4 text-red-400 hover:text-red-600 font-bold text-xl"
              onClick={() => setOpenModal(null)}
            >
              ✕
            </button>

            {openModal.type === 'clubs' && (
              <ClubForm
                clubId={openModal.id}
                onSaved={() => { fetchClubs(); setOpenModal(null) }}
                onClose={() => setOpenModal(null)}
              />
            )}
            {openModal.type === 'teams' && (
              <TeamForm
                teamId={openModal.id}
                onSaved={() => { fetchTeams(); setOpenModal(null) }}
                onClose={() => setOpenModal(null)}
              />
            )}
            {openModal.type === 'users' && (
              <EditUser
                userId={openModal.id}
                onSaved={() => { fetchUsers(); setOpenModal(null) }}
                onClose={() => setOpenModal(null)}
              />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
