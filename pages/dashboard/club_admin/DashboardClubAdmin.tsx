'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = {
  admin: boolean
  club_admin: boolean
}

type ClubMembership = {
  club_id: string
  club_name: string
  role: "club_admin" | "player"
}

type Team = {
  id: string
  name: string
  category: string
  gender: string
  captain_id?: string
  members: ClubUser[]
}

type ClubUser = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type Props = {
  roles: Roles
  clubMemberships: ClubMembership[]
}

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {
  const [loading, setLoading] = useState(true)
  const [clubsData, setClubsData] = useState<any[]>([])
  const [teamsData, setTeamsData] = useState<Team[]>([])
  const [usersData, setUsersData] = useState<ClubUser[]>([])
  const [selectedClub, setSelectedClub] = useState<string | null>(null)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // 1️⃣ récupérer les clubs
      let clubsQuery = supabase.from("clubs").select("*")
      if (!roles.admin) {
        const clubIds = clubMemberships.map(c => c.club_id)
        clubsQuery = clubsQuery.in("id", clubIds)
      }
      const { data: clubs, error: clubsError } = await clubsQuery
      if (clubsError) console.error(clubsError)
      setClubsData(clubs || [])

      // 2️⃣ récupérer toutes les équipes des clubs visibles
      const clubIdsForTeams = roles.admin
        ? clubs?.map(c => c.id)
        : clubMemberships.map(c => c.club_id)
      const { data: teams, error: teamsError } = await supabase
        .from("teams")
        .select("*, captain:team_memberships(user_id)")
        .in("club_id", clubIdsForTeams || [])
      if (teamsError) console.error(teamsError)

      // 3️⃣ récupérer tous les membres des clubs
      const { data: members, error: membersError } = await supabase
        .from("club_memberships")
        .select("*, users!inner(first_name, last_name, email)")
        .in("club_id", clubIdsForTeams || [])
      if (membersError) console.error(membersError)

      // dédupliquer les utilisateurs par user_id
      const usersMap: Record<string, ClubUser> = {}
      (members || []).forEach((m: any) => {
        if (m.users && !usersMap[m.user_id]) {
          usersMap[m.user_id] = {
            id: m.user_id,
            first_name: m.users.first_name,
            last_name: m.users.last_name,
            email: m.users.email
          }
        }
      })
      setUsersData(Object.values(usersMap))

      // reconstruire les équipes avec les membres
      const teamsWithMembers: Team[] = (teams || []).map((t: any) => {
        const teamMembers = (members || [])
          .filter((m: any) => m.team_id === t.id)
          .map((m: any) => usersMap[m.user_id])
          .filter(Boolean)
        return {
          id: t.id,
          name: t.name,
          category: t.category,
          gender: t.gender,
          captain_id: t.captain?.user_id,
          members: teamMembers
        }
      })

      // ordre automatique : catégorie > nom
      teamsWithMembers.sort((a, b) =>
        a.category.localeCompare(b.category) || a.name.localeCompare(b.name)
      )
      setTeamsData(teamsWithMembers)

      setLoading(false)
    }

    fetchData()
  }, [refresh])

  const handleAddTeam = async (clubId: string) => {
    const { data, error } = await supabase
      .from("teams")
      .insert([{ club_id: clubId, name: "Nouvelle équipe", category: "P50", gender: "Homme" }])
    if (error) return console.error(error)
    setRefresh(r => r + 1)
  }

  const handleAssignCaptain = async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from("team_memberships")
      .update({ role: "captain" })
      .eq("team_id", teamId)
      .eq("user_id", userId)
    if (error) return console.error(error)
    setRefresh(r => r + 1)
  }

  const handleAddPlayer = async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from("team_memberships")
      .insert([{ team_id: teamId, user_id: userId, role: "player" }])
    if (error) return console.error(error)
    setRefresh(r => r + 1)
  }

  const handleRemovePlayer = async (teamId: string, userId: string) => {
    const { error } = await supabase
      .from("team_memberships")
      .delete()
      .eq("team_id", teamId)
      .eq("user_id", userId)
    if (error) return console.error(error)
    setRefresh(r => r + 1)
  }

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-6">
      {clubsData.map(club => (
        <div key={club.id} className="border border-gray-700 p-4 rounded">
          <h2 className="text-xl font-bold mb-2">{club.name}</h2>
          <button
            className="bg-green-600 text-white px-2 py-1 rounded mb-2"
            onClick={() => handleAddTeam(club.id)}
          >
            Ajouter équipe
          </button>

          {teamsData.filter(t => t.club_id === club.id).map(team => (
            <div key={team.id} className="border border-gray-500 p-2 mb-2 rounded">
              <div className="flex justify-between items-center mb-2">
                <div>
                  <span className="font-bold">{team.name}</span> - {team.category} ({team.gender})
                </div>
              </div>

              <div className="mb-2">
                <strong>Capitaine :</strong>{" "}
                <select
                  value={team.captain_id || ""}
                  onChange={e => handleAssignCaptain(team.id, e.target.value)}
                >
                  <option value="">-- Aucun --</option>
                  {team.members.map(u => (
                    <option key={u.id} value={u.id}>
                      {u.first_name} {u.last_name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <strong>Membres :</strong>
                {usersData
                  .filter(u =>
                    clubMemberships.some(
                      c => c.club_id === club.id && c.role === "club_admin"
                    ) || roles.admin
                      ? true
                      : false
                  )
                  .map(u => {
                    const isInTeam = team.members.some(m => m.id === u.id)
                    return (
                      <div key={u.id} className="flex items-center justify-between">
                        <span>
                          {u.first_name} {u.last_name} {isInTeam ? "(dans équipe)" : ""}
                        </span>
                        {isInTeam ? (
                          <button
                            className="text-red-500"
                            onClick={() => handleRemovePlayer(team.id, u.id)}
                          >
                            Supprimer
                          </button>
                        ) : (
                          <button
                            className="text-green-500"
                            onClick={() => handleAddPlayer(team.id, u.id)}
                          >
                            Ajouter
                          </button>
                        )}
                      </div>
                    )
                  })}
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  )
}
