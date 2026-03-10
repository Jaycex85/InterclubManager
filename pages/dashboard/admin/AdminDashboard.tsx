'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'

// Icônes
import { FaUsers, FaBuilding } from 'react-icons/fa'
import { MdSportsTennis } from 'react-icons/md'

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

  /** FETCH CLUBS */
  const fetchClubs = async () => {
    const { data, error } = await supabase
      .from('clubs')
      .select('*')
      .order('name')

    if (!error) setClubs(data || [])
  }

  /** FETCH TEAMS */
  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`id, name, club_id, category, club:club_id(name)`)
      .order('name')

    if (!error) {
      setTeams(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          club_id: t.club_id,
          club_name: t.club?.name || '',
          category: t.category
        }))
      )
    }
  }

  /** FETCH USERS */
  const fetchUsers = async () => {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .order('email')

    if (!error) setUsers(data || [])
  }

  useEffect(() => {
    fetchClubs()
    fetchTeams()
    fetchUsers()
  }, [])

  /** PANELS */
  const panels: {
    key: PanelKey
    label: string
    icon: JSX.Element
    color: string
    items: { id: string; title: string }[]
  }[] = [

    {
      key: 'clubs',
      label: 'Clubs',
      icon: <FaBuilding className="inline mr-2" />,
      color: 'bg-green-700 hover:bg-green-600',
      items: clubs.map(c => ({
        id: c.id,
        title: c.city ? `${c.name} - ${c.city}` : c.name
      }))
    },

    {
      key: 'teams',
      label: 'Teams',
      icon: <MdSportsTennis className="inline mr-2" />,
      color: 'bg-blue-700 hover:bg-blue-600',
      items: teams.map(t => {

        const clubPart =
          t.club_name && t.club_name !== t.name
            ? ` - ${t.club_name}`
            : ''

        const categoryPart =
          t.category
            ? ` - ${t.category}`
            : ''

        return {
          id: t.id,
          title: `${t.name}${clubPart}${categoryPart}`
        }
      })
    },

    {
      key: 'users',
      label: 'Users',
      icon: <FaUsers className="inline mr-2" />,
      color: 'bg-yellow-500 hover:bg-yellow-400',
      items: users.map(u => ({
        id: u.id,
        title: u.first_name
          ? `${u.first_name} ${u.last_name || ''} - ${u.email}`
          : u.email
      }))
    }

  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">

      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">
        Admin Dashboard
      </h1>

      <div className="space-y-4">

        {panels.map(panel => (

          <div
            key={panel.key}
            className="border border-gray-700 rounded overflow-hidden"
          >

            {/* HEADER */}

            <button
              className="w-full text-left p-4 flex items-center justify-between font-bold"
              style={{
                backgroundColor:
                  panel.key === 'clubs'
                    ? '#166534'
                    : panel.key === 'teams'
                    ? '#1e40af'
                    : '#f59e0b'
              }}
              onClick={() =>
                setOpenPanel(
                  openPanel === panel.key
                    ? null
                    : panel.key
                )
              }
            >

              <span className="flex items-center">
                {panel.icon} {panel.label}
              </span>

              <span
                className={`ml-2 transform transition-transform duration-300 ${
                  openPanel === panel.key ? 'rotate-180' : ''
                }`}
              >
                ▼
              </span>

            </button>


            {/* PANEL CONTENT */}

            {openPanel === panel.key && (

              <div className="p-4 grid gap-2">

                {/* ADD CLUB */}

                {panel.key === 'clubs' && (
                  <button
                    className="w-full text-left p-2 rounded bg-green-600 hover:bg-green-700 text-white font-bold"
                    onClick={() =>
                      setOpenModal({ type: 'clubs', id: 'new' })
                    }
                  >
                    + Ajouter un club
                  </button>
                )}

                {/* ADD TEAM */}

                {panel.key === 'teams' && (
                  <button
                    className="w-full text-left p-2 rounded bg-blue-600 hover:bg-blue-700 text-white font-bold"
                    onClick={() =>
                      setOpenModal({ type: 'teams', id: 'new' })
                    }
                  >
                    + Ajouter une team
                  </button>
                )}

                {/* ITEMS */}

                {panel.items.map(item => (

                  <button
                    key={item.id}
                    className={`w-full text-left p-2 rounded ${panel.color} text-white font-medium transition-colors`}
                    onClick={() =>
                      setOpenModal({
                        type: panel.key,
                        id: item.id
                      })
                    }
                  >
                    {item.title}
                  </button>

                ))}

              </div>

            )}

          </div>

        ))}

      </div>


      {/* MODAL */}

      {openModal && (

        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">

          <div className="bg-gray-800 p-6 rounded shadow-lg w-full max-w-lg animate-fadeIn">

            <button
              className="mb-4 text-red-400 hover:text-red-600 font-bold"
              onClick={() => setOpenModal(null)}
            >
              Fermer ✕
            </button>

            {openModal.type === 'clubs' && (
              <ClubForm
                clubId={openModal.id}
                onSaved={() => {
                  fetchClubs()
                  setOpenModal(null)
                }}
                onClose={() => setOpenModal(null)}
              />
            )}

            {openModal.type === 'teams' && (
              <TeamForm
                teamId={openModal.id}
                onSaved={() => {
                  fetchTeams()
                  setOpenModal(null)
                }}
                onClose={() => setOpenModal(null)}
              />
            )}

            {openModal.type === 'users' && (
              <EditUser
                userId={openModal.id}
                onSaved={() => {
                  fetchUsers()
                  setOpenModal(null)
                }}
                onClose={() => setOpenModal(null)}
              />
            )}

          </div>

        </div>

      )}

      {/* ANIMATION */}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fadeIn {
          animation: fadeIn 0.3s ease-out;
        }
      `}</style>

    </div>
  )
}
