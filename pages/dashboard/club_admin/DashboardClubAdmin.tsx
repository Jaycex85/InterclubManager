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
  role: "player" | "club_admin"
}

type Team = {
  id: string
  name: string
  gender: "Homme" | "Dame" | "Mixte"
  category: string
}

type User = {
  id: string
  email: string
  first_name: string
  last_name: string
}

interface Props {
  roles: Roles
  clubMemberships: ClubMembership[]
}

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {
  const [teams, setTeams] = useState<Team[]>([])
  const [clubUsers, setClubUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      if (!clubMemberships.length) return

      // On récupère toutes les équipes des clubs du user
      const clubIds = clubMemberships.map(c => c.club_id)
      const { data: teamsData } = await supabase
        .from("teams")
        .select("id, name, gender, category, club_id")
        .in("club_id", clubIds)

      setTeams(teamsData || [])

      // Tous les users liés aux clubs
      const { data: usersData } = await supabase
        .from("users")
        .select("id, email, first_name, last_name")
        .in("id", clubMemberships.map(c => c.club_id)) // on filtre sur club_id si nécessaire
      setClubUsers(usersData || [])

      setLoading(false)
    }

    fetchData()
  }, [clubMemberships])

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-4">
      {teams.map(team => (
        <div key={team.id} className="border p-4 rounded bg-gray-800">
          <h2 className="font-bold text-lg">{team.name} ({team.gender}) - {team.category}</h2>
          <div className="mt-2">
            <strong>Joueurs liés au club:</strong>
            <ul className="list-disc ml-5">
              {clubUsers.map(u => (
                <li key={u.id}>{u.first_name} {u.last_name} ({u.email})</li>
              ))}
            </ul>
          </div>
        </div>
      ))}
    </div>
  )
}
