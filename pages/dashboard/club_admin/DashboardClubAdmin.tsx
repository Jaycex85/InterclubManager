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

  const usersById = useMemo(() => {
    const map: Record<string, ClubUser> = {}
    users.forEach(u => map[u.id] = u)
    return map
  }, [users])

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)

      try {
        const clubIds = roles.admin
          ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
          : clubMemberships.map(c => c.club_id)

        // Récupération équipes
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .in("club_id", clubIds)
          .order("name")
        if (teamsError) throw teamsError
        setTeams(teamsData || [])

        // Récupération membres
        const teamIds = (teamsData || []).map(t => t.id)
        if (teamIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from("team_memberships")
            .select("*")
            .in("team_id", teamIds)
          if (membersError) throw membersError
          setMembers(membersData || [])
        }

        // Récupération users du club
        const { data: clubUsersData, error: usersError } = await supabase
          .from("club_memberships")
          .select("user_id, users(id, first_name, last_name, email)")
          .in("club_id", clubIds)
        if (usersError) throw usersError

        const usersMap: Record<string, ClubUser> = {}
        ;(clubUsersData || []).forEach((m: any) => {
          if (m.users) {
            usersMap[m.users.id] = {
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

  if (loading) return <div>Chargement des équipes et joueurs...</div>

  return (
    <div className="space-y-6 text-white">

      {/* ----------- FORMULAIRE AJOUT D'ÉQUIPE ----------- */}
      {(roles.admin || roles.club_admin) && clubMemberships.map(c => (
        <AddTeamForm key={c.club_id} clubId={c.club_id} setTeams={setTeams} />
      ))}

      {/* ----------- LISTE DES ÉQUIPES ----------- */}
      {teams
        .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
        .map(team => {
          const teamMembers = members.filter(m => m.team_id === team.id)

          return (
            <div key={team.id} className="border border-gray-600 rounded p-4 bg-gray-800">
              <h2 className="text-lg font-bold text-yellow-400">
                {team.name} ({team.gender}) - {team.category}
              </h2>

              {/* Membres de l'équipe */}
              <div className="mt-2 space-y-1">
                {teamMembers.map(tm => {
                  const user = usersById[tm.user_id]
                  return (
                    <div key={tm.user_id} className="flex justify-between items-center">
                      <span>
                        {user ? `${user.first_name} ${user.last_name}` : "(Utilisateur inconnu)"} - {tm.role}
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
                                prev.filter(m => !(m.team_id === tm.team_id && m.user_id === tm.user_id))
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

              {/* Ajouter joueur */}
              {(roles.admin || roles.club_admin) && (
                <AddPlayerForm
                  team={team}
                  members={members}
                  setMembers={setMembers}
                  users={users}
                />
              )}

              {/* Assigner capitaine */}
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

// ---------------------- Add Team Form ----------------------
function AddTeamForm({ clubId, setTeams }: { clubId: string, setTeams: React.Dispatch<React.SetStateAction<Team[]>> }) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [gender, setGender] = useState("")
  const [loading, setLoading] = useState(false)

  const handleAddTeam = async () => {
    if (!name) return
    setLoading(true)
    const { data, error } = await supabase
      .from("teams")
      .insert({ name, category, gender, club_id: clubId })
      .select()
      .single()
    setLoading(false)
    if (!error && data) {
      setTeams(prev => [...prev, data])
      setName("")
      setCategory("")
      setGender("")
    } else {
      console.error("Erreur création équipe:", error)
    }
  }

  return (
    <div className="border border-gray-600 rounded p-4 bg-gray-700">
      <h3 className="font-bold text-blue-300 mb-2">Créer une nouvelle équipe</h3>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-4">
        <input
          type="text"
          placeholder="Nom de l'équipe"
          value={name}
          onChange={e => setName(e.target.value)}
          className="bg-gray-600 text-white p-2 rounded flex-1"
        />
        <input
          type="text"
          placeholder="Catégorie"
          value={category}
          onChange={e => setCategory(e.target.value)}
          className="bg-gray-600 text-white p-2 rounded"
        />
        <input
          type="text"
          placeholder="Genre"
          value={gender}
          onChange={e => setGender(e.target.value)}
          className="bg-gray-600 text-white p-2 rounded"
        />
        <button
          className={`bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded text-white ${loading ? "opacity-50 cursor-not-allowed" : ""}`}
          onClick={handleAddTeam}
          disabled={loading}
        >
          {loading ? "Création..." : "Créer"}
        </button>
      </div>
    </div>
  )
}
