'use client'

import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'

// Formulaires dynamiques
const ClubForm = dynamic(() => import('./clubs/EditClub'), { ssr: false })
const TeamForm = dynamic(() => import('./teams/EditTeam'), { ssr: false })
const EditUser = dynamic(() => import('./users/EditUser'), { ssr: false })

type PanelKey = 'clubs' | 'teams' | 'users'

type Club = { id: string; name: string; city?: string }
type Team = {
  id: string
  name: string
  club_id: string
  club_name?: string
  category?: string
  captain_id?: string
  captain_email?: string
}
type User = { id: string; email: string; first_name?: string; last_name?: string }

type ExpandableItemProps = {
  title: string
  isOpen: boolean
  onToggle: () => void
  children: React.ReactNode
}

function ExpandableItem({ title, isOpen, onToggle, children }: ExpandableItemProps) {
  const ref = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState('0px')

  // recalculer la hauteur après rendu (pour composants dynamiques)
  useLayoutEffect(() => {
    if (!ref.current) return
    const el = ref.current
    const id = requestAnimationFrame(() => {
      setHeight(isOpen ? `${el.scrollHeight}px` : '0px')
    })
    return () => cancelAnimationFrame(id)
  }, [isOpen, children])

  return (
    <div className="mb-4 border-b border-gray-600">
      <button
        className="w-full text-left font-bold p-2 bg-gray-700 hover:bg-gray-600"
        onClick={onToggle}
      >
        {title}
      </button>
      <div
        ref={ref}
        style={{ maxHeight: height, overflow: 'hidden', transition: 'max-height 0.35s ease' }}
        className="p-2 bg-gray-600 rounded mt-2"
      >
        {children}
      </div>
    </div>
  )
}

export default function AdminDashboard() {
  const [openPanels, setOpenPanels] = useState<PanelKey[]>([])
  const [openClubId, setOpenClubId] = useState<string | null>(null)
  const [openTeamId, setOpenTeamId] = useState<string | null>(null)
  const [openUserId, setOpenUserId] = useState<string | null>(null)

  const [clubs, setClubs] = useState<Club[]>([])
  const [teams, setTeams] = useState<Team[]>([])
  const [users, setUsers] = useState<User[]>([])

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
        captain_id,
        club:club_id(name),
        captain:captain_id(email)
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
          captain_id: t.captain_id,
          captain_email: t.captain?.email || '',
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

          return (
            <div key={key} ref={panelRefs[key]}>
              <button
                onClick={() => togglePanel(key)}
                className={`w-full ${color} p-4 md:p-6 rounded shadow text-black font-bold text-xl flex justify-between items-center`}
              >
                <span>{label}</span>
                <span className={`ml-2 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                  ▼
                </span>
              </button>

              <div className={`mt-2 bg-gray-800 rounded shadow ${isOpen ? 'p-4 md:p-6' : 'p-0'}`}>
                {/* ---------- CLUBS ---------- */}
                {key === 'clubs' &&
                  clubs.map(club => (
                    <ExpandableItem
                      key={club.id}
                      title={`${club.name}${club.city ? ` - ${club.city}` : ''}`}
                      isOpen={openClubId === club.id}
                      onToggle={() => setOpenClubId(openClubId === club.id ? null : club.id)}
                    >
                      <ClubForm
                        clubId={club.id}
                        onSaved={async () => {
                          await fetchClubs()
                          setOpenClubId(null)
                        }}
                        onClose={() => setOpenClubId(null)}
                      />
                    </ExpandableItem>
                  ))}

                {/* ---------- TEAMS ---------- */}
                {key === 'teams' &&
                  teams.map(team => (
                    <ExpandableItem
                      key={team.id}
                      title={`${team.name} - ${team.club_name}${team.category ? ` - ${team.category}` : ''}`}
                      isOpen={openTeamId === team.id}
                      onToggle={() => setOpenTeamId(openTeamId === team.id ? null : team.id)}
                    >
                      <TeamForm
                        teamId={team.id}
                        onSaved={async () => {
                          await fetchTeams()
                          setOpenTeamId(null)
                        }}
                        onClose={() => setOpenTeamId(null)}
                      />
                    </ExpandableItem>
                  ))}

                {/* ---------- USERS ---------- */}
                {key === 'users' &&
                  users.map(user => (
                    <ExpandableItem
                      key={user.id}
                      title={`${user.email}${user.first_name ? ` - ${user.first_name} ${user.last_name || ''}` : ''}`}
                      isOpen={openUserId === user.id}
                      onToggle={() => setOpenUserId(openUserId === user.id ? null : user.id)}
                    >
                      <EditUser
                        userId={user.id}
                        onSaved={async () => {
                          await fetchUsers()
                          setOpenUserId(null)
                        }}
                        onClose={() => setOpenUserId(null)}
                      />
                    </ExpandableItem>
                  ))}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
