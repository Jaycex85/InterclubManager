'use client'

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"
import { supabase } from "../../../utils/supabaseClient"

// Panels dynamiques existants
const ClubsIndex = dynamic(() => import("./clubs/index"), { ssr: false })

// Teams panel imbriqué
type TeamItem = {
  id: string
  name: string
  club_id: string
  players: { id: string; email: string; role: string }[]
}

const TeamsIndex = () => {
  const [teams, setTeams] = useState<TeamItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTeams = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("teams")
      .select(`
        id,
        name,
        club_id,
        players:user_teams (
          id,
          email,
          role
        )
      `)
    if (error) console.error(error)
    else setTeams(data)
    setLoading(false)
  }

  useEffect(() => { fetchTeams() }, [])

  return (
    <div className="space-y-4">
      {loading ? <p>Chargement des équipes...</p> : teams.map(t => (
        <div key={t.id} className="p-4 bg-gray-800 rounded shadow">
          <p className="font-bold">{t.name} (Club {t.club_id})</p>
          {t.players.length === 0 ? <p className="text-gray-400 text-sm">Aucun joueur assigné</p> : (
            <ul className="mt-2 space-y-1">
              {t.players.map(p => (
                <li key={p.id} className="flex justify-between bg-gray-700 p-2 rounded">
                  <span>{p.email} — {p.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// Users panel imbriqué
type UserItem = {
  id: string
  email: string
  club_memberships: { club_id: string; role: string }[]
}

const UsersIndex = () => {
  const [users, setUsers] = useState<UserItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        email,
        club_memberships (
          club_id,
          role
        )
      `)
    if (error) console.error(error)
    else setUsers(data)
    setLoading(false)
  }

  useEffect(() => { fetchUsers() }, [])

  const toggleClubAdmin = async (userId: string, clubId: string, currentRole: string) => {
    const newRole = currentRole === "club_admin" ? "member" : "club_admin"
    const { error } = await supabase
      .from("club_memberships")
      .update({ role: newRole })
      .eq("user_id", userId)
      .eq("club_id", clubId)
    if (error) alert(error.message)
    else fetchUsers()
  }

  return (
    <div className="space-y-4">
      {loading ? <p>Chargement des utilisateurs...</p> : users.map(u => (
        <div key={u.id} className="p-4 bg-gray-800 rounded shadow">
          <p className="font-bold">{u.email}</p>
          {u.club_memberships.length === 0 ? <p className="text-gray-400 text-sm">Aucun club associé</p> : (
            <ul className="mt-2 space-y-1">
              {u.club_memberships.map(cm => (
                <li key={cm.club_id} className="flex justify-between items-center bg-gray-700 p-2 rounded">
                  <span>{cm.club_id} — {cm.role}</span>
                  <button
                    className="bg-yellow-500 px-2 py-1 rounded hover:bg-yellow-600 text-black text-sm"
                    onClick={() => toggleClubAdmin(u.id, cm.club_id, cm.role)}
                  >
                    {cm.role === "club_admin" ? "Retirer admin" : "Nommer admin"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

// Players panel imbriqué
type PlayerItem = {
  id: string
  email: string
  teams: { id: string; name: string; club_id: string; role: string }[]
}

const PlayersIndex = () => {
  const [players, setPlayers] = useState<PlayerItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchPlayers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("users")
      .select(`
        id,
        email,
        teams:user_teams (
          id,
          name,
          club_id,
          role
        )
      `)
      .in("teams.role", ["player", "captain"])
    if (error) console.error(error)
    else setPlayers(data)
    setLoading(false)
  }

  useEffect(() => { fetchPlayers() }, [])

  return (
    <div className="space-y-4">
      {loading ? <p>Chargement des joueurs...</p> : players.map(p => (
        <div key={p.id} className="p-4 bg-gray-800 rounded shadow">
          <p className="font-bold">{p.email}</p>
          {p.teams.length === 0 ? <p className="text-gray-400 text-sm">Pas d'équipe assignée</p> : (
            <ul className="mt-2 space-y-1">
              {p.teams.map(t => (
                <li key={t.id} className="flex justify-between bg-gray-700 p-2 rounded">
                  <span>{t.name} (Club {t.club_id}) — {t.role}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  )
}

type PanelKey = "clubs" | "teams" | "users" | "players"

export default function AdminDashboard() {
  const [openPanels, setOpenPanels] = useState<PanelKey[]>([])

  const panelRefs: Record<PanelKey, React.RefObject<HTMLDivElement>> = {
    clubs: useRef(null),
    teams: useRef(null),
    users: useRef(null),
    players: useRef(null),
  }

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels(prev =>
      prev.includes(panel) ? prev.filter(p => p !== panel) : [...prev, panel]
    )
  }

  useEffect(() => {
    openPanels.forEach(panel => {
      const ref = panelRefs[panel].current
      if (ref) ref.scrollIntoView({ behavior: "smooth", block: "start" })
    })
  }, [openPanels])

  const useSlideDown = (isOpen: boolean) => {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState("0px")
    useEffect(() => {
      if (ref.current) setHeight(isOpen ? `${ref.current.scrollHeight}px` : "0px")
    }, [isOpen])
    return { ref, style: { maxHeight: height, transition: "max-height 0.35s ease" } }
  }

  const panels: { key: PanelKey; label: string; component: JSX.Element; color: string }[] = [
    { key: "clubs", label: "Clubs", component: <ClubsIndex />, color: "bg-yellow-500 hover:bg-yellow-600" },
    { key: "teams", label: "Teams", component: <TeamsIndex />, color: "bg-green-500 hover:bg-green-600" },
    { key: "users", label: "Utilisateurs", component: <UsersIndex />, color: "bg-purple-500 hover:bg-purple-600" },
    { key: "players", label: "Joueurs", component: <PlayersIndex />, color: "bg-blue-500 hover:bg-blue-600" },
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">
        Admin Dashboard
      </h1>

      <div className="space-y-4 md:space-y-6">
        {panels.map(({ key, label, component, color }) => {
          const isOpen = openPanels.includes(key)
          const { ref, style } = useSlideDown(isOpen)

          return (
            <div key={key} ref={panelRefs[key]}>
              <button
                onClick={() => togglePanel(key)}
                className={`w-full ${color} p-4 md:p-6 rounded shadow text-black font-bold text-xl flex justify-between items-center`}
              >
                <span>{label}</span>
                <span className={`ml-2 transform transition-transform duration-300 ${isOpen ? "rotate-180" : ""}`}>
                  ▼
                </span>
              </button>

              <div ref={ref} style={style} className="overflow-hidden mt-2 bg-gray-800 rounded shadow">
                <div className="p-4 md:p-6">{component}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
