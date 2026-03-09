'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Player = {
  id: string
  email: string
  first_name: string
  last_name: string
}

type Team = {
  id: string
  name: string
  category: string
  gender: "Homme" | "Dames" | "Mixte"
  captain_id?: string
  players: Player[]
}

type Props = {
  clubId: string
}

const CATEGORIES = {
  Homme: ["P50","P100","P200","P300","P400","P500","P700","P1000"],
  Dames: ["WD50","WD100","WD200","WD300","WD400","WD500"],
  Mixte: ["MX50","MX100","MX200","MX300","MX400","MXOPEN"]
}

export default function DashboardClubAdmin({ clubId }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null)
  const [searchPlayer, setSearchPlayer] = useState("")

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      // 1️⃣ Fetch teams du club
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id,name,category,gender,captain_id,team_memberships(user_id)")
        .eq("club_id", clubId)

      // 2️⃣ Fetch joueurs liés au club (Supabase Auth)
      const { data: playersData } = await supabase
        .from("club_memberships")
        .select("user_id, users(email, raw_first_name, raw_last_name)")
        .eq("club_id", clubId)

      const mappedPlayers: Player[] = (playersData || []).map((p: any) => ({
        id: p.user_id,
        email: p.users.email,
        first_name: p.users.raw_first_name || p.users.first_name || "",
        last_name: p.users.raw_last_name || p.users.last_name || ""
      }))

      setPlayers(mappedPlayers)

      const mappedTeams: Team[] = (teamsData || []).map((t: any) => ({
        id: t.id,
        name: t.name,
        category: t.category,
        gender: t.gender,
        captain_id: t.captain_id,
        players: t.team_memberships?.map((m: any) => {
          const p = mappedPlayers.find(pl => pl.id === m.user_id)
          return p ? p : { id: m.user_id, email: "", first_name: "(capitaine)", last_name: "" }
        }) || []
      }))

      setTeams(mappedTeams)
      setLoading(false)
    }

    fetchData()
  }, [clubId])

  if (loading) return <div>Chargement du club...</div>

  const handleAddTeam = async () => {
    const { data, error } = await supabase
      .from("teams")
      .insert({ club_id: clubId, name: "Nouvelle équipe", category: "P50", gender: "Homme" })
      .select()
    if (!error && data?.length) {
      setTeams([...teams, { ...data[0], players: [] }])
    }
  }

  return (
    <div className="p-4 border border-gray-600 rounded space-y-4 bg-gray-800">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Club {clubId} - {teams.length} équipes</h2>
        <button className="bg-yellow-500 px-4 py-2 rounded text-black" onClick={handleAddTeam}>
          Ajouter une équipe
        </button>
      </div>

      {/* Filtre catégorie */}
      <div className="flex space-x-2">
        <select className="p-1 rounded" value={categoryFilter || ""} onChange={e => setCategoryFilter(e.target.value || null)}>
          <option value="">Toutes catégories</option>
          {Object.values(CATEGORIES).flat().map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input
          type="text"
          placeholder="Rechercher joueur..."
          className="p-1 rounded"
          value={searchPlayer}
          onChange={e => setSearchPlayer(e.target.value)}
        />
      </div>

      <div className="space-y-4">
        {teams
          .filter(t => !categoryFilter || t.category === categoryFilter)
          .map(team => (
            <div key={team.id} className="border border-gray-700 p-2 rounded bg-gray-900">
              <div className="flex justify-between items-center">
                <div>
                  <strong>{team.name}</strong> ({team.gender}) - Cat: {team.category}
                </div>
                <div>
                  Capitane: {team.players.find(p => p.id === team.captain_id)?.first_name || "(capitaine)"}
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-2">
                {team.players
                  .filter(p => !searchPlayer || `${p.first_name} ${p.last_name}`.toLowerCase().includes(searchPlayer.toLowerCase()))
                  .map(p => (
                    <span key={p.id} className="bg-gray-700 px-2 py-1 rounded">
                      {p.first_name} {p.last_name}
                    </span>
                  ))}
              </div>
            </div>
          ))}
      </div>
    </div>
  )
}
