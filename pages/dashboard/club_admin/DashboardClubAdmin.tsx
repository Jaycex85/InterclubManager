'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// -------------------------------------------
// Catégories
const categories: Record<string, string[]> = {
  Homme: ["P50","P100","P200","P300","P400","P500","P700","P1000"],
  Dames: ["WD50","WD100","WD200","WD300","WD400","WD500"],
  Mixte: ["MX50","MX100","MX200","MX300","MX400","MXOPEN"]
}

// -------------------------------------------
// Types
type User = { id: string; first_name: string; last_name: string; email: string }
type Team = { id: string; name: string; gender: string; players: User[]; captain?: User }

// -------------------------------------------
// DashboardClubAdmin
export default function DashboardClubAdmin({ clubId }: { clubId: string }) {
  const [teams, setTeams] = useState<Team[]>([])
  const [clubPlayers, setClubPlayers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  const [newTeamName, setNewTeamName] = useState("")
  const [newTeamCategory, setNewTeamCategory] = useState("")
  const [filterCategory, setFilterCategory] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1️⃣ Récupérer les équipes du club
      const { data: teamsData } = await supabase
        .from("teams")
        .select(`id, name, gender, team_memberships(user_id, role, users(first_name, last_name, email))`)
        .eq("club_id", clubId)

      const teamsMapped: Team[] = (teamsData || []).map((t: any) => {
        const players: User[] = t.team_memberships
          .filter((tm: any) => tm.role === "player")
          .map((tm: any) => tm.users)
        const captain: User | undefined = t.team_memberships
          .filter((tm: any) => tm.role === "captain")
          .map((tm: any) => tm.users)[0]
        return { id: t.id, name: t.name, gender: t.gender, players, captain }
      })

      setTeams(teamsMapped)

      // 2️⃣ Récupérer tous les joueurs liés au club
      const { data: clubUsers } = await supabase
        .from("club_memberships")
        .select(`user_id, users(first_name, last_name, email)`)
        .eq("club_id", clubId)

      setClubPlayers((clubUsers || []).map((u: any) => ({ ...u.users, id: u.user_id })))
      setLoading(false)
    }

    fetchData()
  }, [clubId])

  const handleAddTeam = async () => {
    if (!newTeamName || !newTeamCategory) return
    const { data: inserted, error } = await supabase
      .from("teams")
      .insert({ name: newTeamName, gender: newTeamCategory, club_id: clubId })
      .select()
      .single()

    if (!error && inserted) {
      setTeams(prev => [...prev, { ...inserted, players: [] }])
      setNewTeamName("")
      setNewTeamCategory("")
    } else console.error(error)
  }

  const handleAddPlayer = async (teamId: string, userId: string, role: "player" | "captain") => {
    const { data: inserted, error } = await supabase
      .from("team_memberships")
      .insert({ team_id: teamId, user_id: userId, role })
      .select()
      .single()

    if (!error && inserted) {
      setTeams(prev =>
        prev.map(t => {
          if (t.id === teamId) {
            const user = clubPlayers.find(u => u.id === userId)
            if (!user) return t
            if (role === "captain") return { ...t, captain: user }
            return { ...t, players: [...t.players, user] }
          }
          return t
        })
      )
    } else console.error(error)
  }

  const filteredTeams = filterCategory
    ? teams.filter(t => t.gender === filterCategory)
    : teams

  if (loading) return <div>Chargement...</div>

  return (
    <div className="p-6 bg-gray-900 text-white min-h-screen">
      <h2 className="text-2xl font-bold mb-4">Dashboard Club Admin</h2>

      {/* ---------- Compteurs ---------- */}
      <div className="flex gap-4 mb-6">
        <div>Nombre d'équipes : {teams.length}</div>
        <div>Nombre de joueurs : {clubPlayers.length}</div>
      </div>

      {/* ---------- Filtre catégorie ---------- */}
      <select
        className="p-2 mb-4 bg-gray-800 rounded"
        value={filterCategory}
        onChange={e => setFilterCategory(e.target.value)}
      >
        <option value="">Toutes catégories</option>
        {Object.values(categories).flat().map(cat => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      {/* ---------- Formulaire ajout équipe ---------- */}
      <div className="mb-6 p-4 border border-gray-700 rounded bg-gray-800 flex gap-2">
        <input
          type="text"
          placeholder="Nom de l'équipe"
          className="p-2 rounded bg-gray-900 flex-1"
          value={newTeamName}
          onChange={e => setNewTeamName(e.target.value)}
        />
        <select
          className="p-2 rounded bg-gray-900"
          value={newTeamCategory}
          onChange={e => setNewTeamCategory(e.target.value)}
        >
          <option value="">Catégorie</option>
          {Object.entries(categories).map(([gender, list]) =>
            list.map(cat => <option key={cat} value={cat}>{`(${gender}) ${cat}`}</option>)
          )}
        </select>
        <button className="bg-yellow-400 text-black px-4 rounded font-bold" onClick={handleAddTeam}>
          Ajouter
        </button>
      </div>

      {/* ---------- Liste des équipes ---------- */}
      {filteredTeams.map(team => (
        <div key={team.id} className="mb-4 p-4 border border-gray-700 rounded bg-gray-800">
          <div className="flex justify-between items-center mb-2">
            <h3 className="font-bold">{team.name} - {team.gender}</h3>
          </div>

          {/* Capitaine */}
          <div className="mb-2">
            <strong>Capitaine :</strong> {team.captain ? `${team.captain.first_name} ${team.captain.last_name}` : "(non défini)"}
          </div>

          {/* Joueurs */}
          <div className="mb-2">
            <strong>Joueurs :</strong> {team.players.map(p => `${p.first_name} ${p.last_name}`).join(", ") || "(aucun)"}
          </div>

          {/* Ajouter joueur / capitaine */}
          <div className="flex gap-2">
            <select id={`player-${team.id}`} className="p-2 rounded bg-gray-900 flex-1">
              <option value="">Sélectionner joueur</option>
              {clubPlayers.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
            <button
              className="bg-green-500 px-3 rounded font-bold"
              onClick={() => {
                const sel = (document.getElementById(`player-${team.id}`) as HTMLSelectElement).value
                if (sel) handleAddPlayer(team.id, sel, "player")
              }}
            >
              Ajouter joueur
            </button>
            <button
              className="bg-blue-500 px-3 rounded font-bold"
              onClick={() => {
                const sel = (document.getElementById(`player-${team.id}`) as HTMLSelectElement).value
                if (sel) handleAddPlayer(team.id, sel, "captain")
              }}
            >
              Définir capitaine
            </button>
          </div>
        </div>
      ))}
    </div>
  )
}
