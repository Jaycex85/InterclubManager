'use client'

import { useEffect, useState, useMemo } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Roles = { admin: boolean; club_admin: boolean }

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
  club_id: string
}

type ClubUser = {
  id: string
  first_name: string
  last_name: string
  email: string
}

type TeamMember = {
  team_id: string
  user_id: string
  role: "player" | "captain"
}

type Props = {
  roles: Roles
  clubMemberships: ClubMembership[]
}

export default function DashboardClubAdmin({ roles, clubMemberships }: Props) {

  const [loading, setLoading] = useState(true)
  const [teams, setTeams] = useState<Team[]>([])
  const [members, setMembers] = useState<TeamMember[]>([])
  const [users, setUsers] = useState<ClubUser[]>([])

  // lookup rapide
  const usersById = useMemo(() => {
    const map: Record<string, ClubUser> = {}
    users.forEach(u => map[u.id] = u)
    return map
  }, [users])

  useEffect(() => {

    const fetchData = async () => {

      setLoading(true)

      try {

        // clubs visibles
        const clubIds = roles.admin
          ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
          : clubMemberships.map(c => c.club_id)

        // équipes
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .in("club_id", clubIds)
          .order("name")

        if (teamsError) throw teamsError

        const teamsList = teamsData || []
        setTeams(teamsList)

        // memberships équipes
        const teamIds = teamsList.map(t => t.id)

        const { data: membersData, error: membersError } = await supabase
          .from("team_memberships")
          .select("*")
          .in("team_id", teamIds)

        if (membersError) throw membersError

        setMembers(membersData || [])

        // users du club
        const { data: clubUsersData, error: usersError } = await supabase
          .from("club_memberships")
          .select(`
            user_id,
            users(
              id,
              first_name,
              last_name,
              email
            )
          `)
          .in("club_id", clubIds)

        if (usersError) throw usersError

        const usersMap: Record<string, ClubUser> = {}

        ;(clubUsersData || []).forEach((m: any) => {

          if (m.users && !usersMap[m.user_id]) {

            usersMap[m.user_id] = {
              id: m.users.id,
              first_name: m.users.first_name,
              last_name: m.users.last_name,
              email: m.users.email
            }

          }

        })

        setUsers(Object.values(usersMap))

      } catch (err) {

        console.error("Erreur dashboard:", err)

      }

      setLoading(false)
    }

    fetchData()

  }, [roles, clubMemberships])

  if (loading) return <div>Chargement des équipes...</div>

  return (

    <div className="space-y-6 text-white">

      {teams
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        .map(team => {

          const teamMembers = members.filter(m => m.team_id === team.id)

          return (

            <div key={team.id} className="border border-gray-600 rounded p-4">

              <h2 className="text-lg font-bold">
                {team.name} ({team.gender}) - {team.category}
              </h2>

              <div className="mt-2 space-y-1">

                {teamMembers.map(tm => {

                  const user = usersById[tm.user_id]

                  return (

                    <div key={tm.user_id} className="flex justify-between items-center">

                      <span>
                        {user
                          ? `${user.first_name} ${user.last_name}`
                          : "(Utilisateur inconnu)"} - {tm.role}
                      </span>

                      {(roles.admin || roles.club_admin) && (

                        <button
                          className="text-red-400 hover:text-red-600"
                          onClick={async () => {

                            const { error } = await supabase
                              .from("team_memberships")
                              .delete()
                              .eq("team_id", tm.team_id)
                              .eq("user_id", tm.user_id)

                            if (!error) {
                              setMembers(prev =>
                                prev.filter(m =>
                                  !(m.team_id === tm.team_id && m.user_id === tm.user_id)
                                )
                              )
                            }

                          }}
                        >
                          Supprimer
                        </button>

                      )}

                    </div>

                  )

                })}

              </div>

              {(roles.admin || roles.club_admin) && (
                <AddPlayerForm
                  team={team}
                  members={members}
                  setMembers={setMembers}
                  users={users}
                />
              )}

              {(roles.admin || roles.club_admin) && (
                <AssignCaptainForm
                  team={team}
                  members={members}
                  setMembers={setMembers}
                  usersById={usersById}
                />
              )}

            </div>

          )
        })}

    </div>

  )
}

function AddPlayerForm({
  team,
  members,
  setMembers,
  users
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
  users: ClubUser[]
}) {

  const [selectedUserId, setSelectedUserId] = useState("")

  const availableUsers = users.filter(
    u => !members.some(m => m.team_id === team.id && m.user_id === u.id)
  )

  const handleAdd = async () => {

    if (!selectedUserId) return

    const { error } = await supabase
      .from("team_memberships")
      .insert({
        team_id: team.id,
        user_id: selectedUserId,
        role: "player"
      })

    if (!error) {

      setMembers(prev => [
        ...prev,
        { team_id: team.id, user_id: selectedUserId, role: "player" }
      ])

      setSelectedUserId("")
    }
  }

  return (

    <div className="mt-2 flex gap-2">

      <select
        className="bg-gray-700 text-white p-1 rounded"
        value={selectedUserId}
        onChange={e => setSelectedUserId(e.target.value)}
      >

        <option value="">Sélectionner un joueur</option>

        {availableUsers.map(u => (
          <option key={u.id} value={u.id}>
            {u.first_name} {u.last_name}
          </option>
        ))}

      </select>

      <button
        className="bg-green-600 hover:bg-green-700 px-2 rounded"
        onClick={handleAdd}
      >
        Ajouter
      </button>

    </div>

  )
}

function AssignCaptainForm({
  team,
  members,
  setMembers,
  usersById
}: {
  team: Team
  members: TeamMember[]
  setMembers: React.Dispatch<React.SetStateAction<TeamMember[]>>
  usersById: Record<string, ClubUser>
}) {

  const [selectedCaptainId, setSelectedCaptainId] = useState("")

  const teamPlayers = members.filter(m => m.team_id === team.id)

  const currentCaptain = teamPlayers.find(m => m.role === "captain")

  const handleAssign = async () => {

    if (!selectedCaptainId) return

    if (currentCaptain) {

      await supabase
        .from("team_memberships")
        .update({ role: "player" })
        .eq("team_id", team.id)
        .eq("user_id", currentCaptain.user_id)

    }

    await supabase
      .from("team_memberships")
      .update({ role: "captain" })
      .eq("team_id", team.id)
      .eq("user_id", selectedCaptainId)

    setMembers(prev =>
      prev.map(m =>
        m.team_id === team.id
          ? m.user_id === selectedCaptainId
            ? { ...m, role: "captain" }
            : { ...m, role: "player" }
          : m
      )
    )

    setSelectedCaptainId("")
  }

  return (

    <div className="mt-2 flex gap-2">

      <select
        className="bg-gray-700 text-white p-1 rounded"
        value={selectedCaptainId}
        onChange={e => setSelectedCaptainId(e.target.value)}
      >

        <option value="">Sélectionner capitaine</option>

        {teamPlayers.map(m => {

          const user = usersById[m.user_id]

          return (
            <option key={m.user_id} value={m.user_id}>
              {user ? `${user.first_name} ${user.last_name}` : m.user_id}
            </option>
          )

        })}

      </select>

      <button
        className="bg-yellow-600 hover:bg-yellow-700 px-2 rounded"
        onClick={handleAssign}
      >
        Assigner
      </button>

    </div>

  )
}
