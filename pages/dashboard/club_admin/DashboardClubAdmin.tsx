'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = { admin: boolean; club_admin: boolean }
type ClubMembership = { club_id: string; club_name: string; role: "club_admin" | "player" }
type Team = { id: string; name: string; category: string; gender: string; club_id: string }
type ClubUser = { id: string; first_name: string; last_name: string; email: string }
type TeamMember = { team_id: string; user_id: string; role: "player" | "captain" }

type Props = { roles: Roles; clubMemberships: ClubMembership[] }

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {
  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      // clubs visibles
      const clubsVisible = roles.admin
        ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
        : clubMemberships.map(c => c.club_id)

      // équipes
      const teamsQuery = supabase.from("teams").select("*").in("club_id", clubsVisible).order("name", { ascending: true })
      const { data: teamsData } = await teamsQuery
      setTeams(teamsData || [])

      // membres d'équipes
      const teamIds = (teamsData || []).map(t => t.id)
      const membersQuery = supabase.from("team_memberships").select("*").in("team_id", teamIds)
      const { data: membersData } = await membersQuery
      setMembers(membersData || [])

      // utilisateurs liés aux clubs
      const clubUsersQuery = supabase.from("club_memberships")
        .select("user_id, users(first_name, last_name, email)")
        .in("club_id", clubsVisible)
      const { data: clubUsersData } = await clubUsersQuery

      const usersMap: Record<string, ClubUser> = {}

      // Ajoute tous les utilisateurs provenant de club_memberships
      (clubUsersData || []).forEach((m: any) => {
        if (m.users && !usersMap[m.user_id]) {
          usersMap[m.user_id] = {
            id: m.user_id,
            first_name: m.users.first_name,
            last_name: m.users.last_name,
            email: m.users.email
          }
        }
      })

      // Ajoute tous les membres d'équipe qui n'ont pas de club_membership
      (membersData || []).forEach((m: TeamMember) => {
        if (!usersMap[m.user_id]) {
          usersMap[m.user_id] = {
            id: m.user_id,
            first_name: "(Prénom inconnu)",
            last_name: "(Nom inconnu)",
            email: ""
          }
        }
      })

      setUsers(Object.values(usersMap))
      setLoading(false)
    }

    fetchData()
  }, [roles, clubMemberships])

  if (loading) return <div className="p-4 text-white">Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-6 text-white">
      {teams
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        .map(team => {
          const teamMembers = members
            .filter(m => m.team_id === team.id)
            .map(m => ({ ...m, user: users.find(u => u.id === m.user_id) }))

          return (
            <div key={team.id} className="border border-gray-600 rounded p-4">
              <h2 className="text-lg font-bold">
                {team.name} ({team.gender}) - {team.category}
              </h2>

              <div className="mt-2 space-y-1">
                {teamMembers.map(tm => {
                  const displayName = tm.user
                    ? `${tm.user.first_name} ${tm.user.last_name}`
                    : "(Joueur non trouvé)"
                  return (
                    <div key={tm.user_id} className="flex justify-between items-center">
                      <span>{displayName} - {tm.role}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
    </div>
  )
}
