'use client'

import { useState, useRef, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'

// Imports dynamiques des formulaires imbriqués
const ClubForm = dynamic(() => import('./clubs/EditClub'), { ssr: false })
const TeamForm = dynamic(() => import('./teams/EditTeam'), { ssr: false })
const EditUser = dynamic(() => import('./users/EditUser'), { ssr: false })

type PanelKey = 'clubs' | 'teams' | 'users'

type Club = {
  id: string
  name: string
  city?: string
}

type Team = {
  id: string
  name: string
  club_id: string
  club_name?: string
  category?: string
  captain_id?: string
  captain_email?: string
}

type User = {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

export default function AdminDashboard() {
  /** ---------- PANEL STATE ---------- */
  const [openPanels, setOpenPanels] = useState<PanelKey[]>([])
  const panelRefs = {
    clubs: useRef<HTMLDivElement>(null),
    teams: useRef<HTMLDivElement>(null),
    users: useRef<HTMLDivElement>(null),
  }

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels(prev =>
      prev.includes(panel) ? prev.filter(p => p !== panel) : [...prev, panel]
    )
  }

  useEffect(() => {
    openPanels.forEach(panel => {
      const ref = panelRefs[panel].current
      if (ref) ref.scrollIntoView({ behavior: 'smooth', block: 'start' })
    })
  }, [openPanels])

  const useSlideDown = (isOpen: boolean) => {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState('0px')
    useEffect(() => {
      if (ref.current) setHeight(isOpen ? `${ref.current.scrollHeight}px` : '0px')
    }, [isOpen])
    return { ref, style: { maxHeight: height, transition: 'max-height 0.35s ease' } }
  }

  /** ---------- DATA STATES ---------- */
  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [openClubId, setOpenClubId] = useState<string | null>(null)
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  /** ---------- FETCH FUNCTIONS ---------- */
  const fetchClubs = async () => {
    const { data, error } = await supabase.from('clubs').select('*').order('name')
    if (error) console.error(error)
    else setClubs(data || [])
  }

  const fetchTeams = async () => {
    const { data, error } = await supabase
      .from('teams')
      .select(`
        id,
        name,
        club_id,
        category,
        captain_id,
        club:club_id(name),
        captain:captain_id(email)
      `)
      .order('name')
    if (error) console.error(error)
    else
      setTeams(
        (data || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          club_id: t.club_id,
          club_name: t.club?.name || '',
          category: t.category,
          captain_id: t.captain_id,
          captain_email: t.captain?.email || '',
        }))
      )
  }

  const fetchUsers = async () => {
    const { data, error } = await supabase.from('users').select('*').order('email')
    if (error) console.error(error)
    else setUsers(data || [])
  }

  useEffect(() => {
    fetchClubs()
    fetchTeams()
    fetchUsers()
  }, [])

  /** ---------- PANELS ---------- */
  const panels: { key: PanelKey; label: string; color: string }[] = [
    { key: 'clubs', label: 'Clubs', color: 'bg-yellow-500 hover:bg-yellow-600' },
    { key: 'teams', label: 'Teams', color: 'bg-green-500 hover:bg-green-600' },
    { key: 'users', label: 'Users', color: 'bg-blue-500 hover:bg-blue-600' },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">
        Admin Dashboard
      </h1>

      <div className="space-y-4 md:space-y-6">
        {panels.map(({ key, label, color }) => {
          const isOpen = openPanels.includes(key)
          const { ref, style } = useSlideDown(isOpen)

          return (
            <div key={key} ref={panelRefs[key]}>
              <button
                onClick={() => togglePanel(key)}
                className={`w-full ${color} p-4 md:p-6 rounded shadow text-black font-bold text-xl flex justify-between items-center`}
              >
                <span>{label}</span>
                <span
                  className={`ml-2 transform transition-transform duration-300 ${
                    isOpen ? 'rotate-180' : ''
                  }`}
                >
                  ▼
                </span>
              </button>

              <div ref={ref} style={style} className="overflow-hidden mt-2 bg-gray-800 rounded shadow">
                <div className="p-4 md:p-6">
                  {key === 'clubs' &&
                    clubs.map(club => (
                      <div key={club.id} className="mb-4 border-b border-gray-600">
                        <button
                          className="w-full text-left font-bold p-2 bg-gray-700 hover:bg-gray-600"
                          onClick={() =>
                            setOpenClubId(openClubId === club.id ? null : club.id)
                          }
                        >
                          {club.name} {club.city ? `- ${club.city}` : ''}
                        </button>
                        {openClubId === club.id && (
                          <div className="p-2 bg-gray-600">
                            <ClubForm
                              clubId={club.id} // <-- correct prop
                              onSaved={() => fetchClubs()}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                  {key === 'teams' &&
                    teams.map(team => (
                      <div key={team.id} className="mb-4 border-b border-gray-600">
                        <button
                          className="w-full text-left font-bold p-2 bg-gray-700 hover:bg-gray-600"
                          onClick={() =>
                            setOpenTeamId(openTeamId === team.id ? null : team.id)
                          }
                        >
                          {team.name} - {team.club_name}
                          {team.category ? ` - ${team.category}` : ''}
                        </button>
                        {openTeamId === team.id && (
                          <div className="p-2 bg-gray-600">
                            <TeamForm
                              teamId={team.id} // <-- correct prop
                              onSaved={() => fetchTeams()}
                            />
                          </div>
                        )}
                      </div>
                    ))}

                  {key === 'users' &&
                    users.map(user => (
                      <div key={user.id} className="mb-4 border-b border-gray-600">
                        <button
                          className="w-full text-left font-bold p-2 bg-gray-700 hover:bg-gray-600"
                          onClick={() =>
                            setOpenUserId(openUserId === user.id ? null : user.id)
                          }
                        >
                          {user.email} {user.first_name ? `- ${user.first_name} ${user.last_name || ''}` : ''}
                        </button>
                        {openUserId === user.id && (
                          <div className="p-2 bg-gray-600">
                            <EditUser
                              userId={user.id} // <-- correct prop
                              onSaved={() => {
                                fetchUsers()
                                setOpenUserId(null)
                              }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
