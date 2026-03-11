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
  const [isModalOpen, setIsModalOpen] = useState(false)

  const usersById = useMemo(() => {
    const map: Record<string, ClubUser> = {}
    users.forEach(u => map[u.id] = u)
    return map
  }, [users])

  // ------------------- Fetch Data -------------------
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const clubIds = roles.admin
          ? (await supabase.from("clubs").select("id")).data?.map(c => c.id) || []
          : clubMemberships.map(c => c.club_id)

        // Équipes
        const { data: teamsData, error: teamsError } = await supabase
          .from("teams")
          .select("*")
          .in("club_id", clubIds)
          .order("name")
        if (teamsError) throw teamsError
        setTeams(teamsData || [])

        // Membres
        const teamIds = (teamsData || []).map(t => t.id)
        if (teamIds.length > 0) {
          const { data: membersData, error: membersError } = await supabase
            .from("team_memberships")
            .select("*")
            .in("team_id", teamIds)
          if (membersError) throw membersError
          setMembers(membersData || [])
        }

        // Users du club
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

  // ------------------- Render -------------------
  return (
    <div className="space-y-6">

      {/* Bouton nouvelle équipe */}
      {(roles.admin || roles.club_admin) && (
        <button
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          onClick={() => setIsModalOpen(true)}
        >
          + Nouvelle équipe
        </button>
      )}

      {/* Modal création équipe */}
      <TeamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onCreate={async ({name, category, gender}) => {
          const { data, error } = await supabase
            .from("teams")
            .insert({ name, category, gender, club_id: clubMemberships[0].club_id })
            .select()
            .single()
          if (!error && data) setTeams(prev => [...prev, data])
        }}
      />

      {/* Liste des équipes en cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {teams
          .sort((a, b) => a.category.localeCompare(b.category) || a.name.localeCompare(b.name))
          .map(team => {
            const teamMembers = members.filter(m => m.team_id === team.id)

            return (
              <div key={team.id} className="bg-gray-800 rounded-lg p-4 border border-gray-600 shadow hover:shadow-lg transition">
                <h2 className="text-lg font-bold text-yellow-400 mb-2">{team.name}</h2>
                <p className="text-gray-300 text-sm mb-2">{team.category} - {team.gender}</p>

                {/* Membres */}
                <div className="space-y-1 mb-2">
                  {teamMembers.map(tm => {
                    const user = usersById[tm.user_id]
                    return (
                      <div key={tm.user_id} className="flex justify-between items-center text-white text-sm">
                        <span>{user ? `${user.first_name} ${user.last_name}` : "(Inconnu)"} - {tm.role}</span>
                        {(roles.admin || roles.club_admin) && (
                          <button
                            className="text-red-400 hover:text-red-600"
                            onClick={async () => {
                              const { error } = await supabase
                                .from("team_memberships")
                                .delete()
                                .eq("team_id", tm.team_id)
                                .eq("user_id", tm.user_id)
                              if (!error) setMembers(prev => prev.filter(m => !(m.team_id === tm.team_id && m.user_id === tm.user_id)))
                            }}
                          >
                            Supprimer
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {/* Formulaires AddPlayer / AssignCaptain */}
                {(roles.admin || roles.club_admin) && (
                  <>
                    <AddPlayerForm team={team} members={members} setMembers={setMembers} users={users} />
                    <AssignCaptainForm team={team} members={members} setMembers={setMembers} usersById={usersById} />
                  </>
                )}
              </div>
            )
          })}
      </div>
    </div>
  )
}

// ------------------- Modal -------------------
function TeamModal({ isOpen, onClose, onCreate }: { isOpen: boolean, onClose: () => void, onCreate: (team: {name: string, category: string, gender: string}) => void }) {
  const [name, setName] = useState("")
  const [category, setCategory] = useState("")
  const [gender, setGender] = useState("")

  if (!isOpen) return null

  const handleSubmit = () => {
    onCreate({ name, category, gender })
    setName(""); setCategory(""); setGender("")
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-gray-800 p-6 rounded w-full max-w-md">
        <h3 className="text-xl font-bold text-yellow-400 mb-4">Créer une nouvelle équipe</h3>
        <input className="w-full mb-2 p-2 rounded bg-gray-700 text-white" placeholder="Nom" value={name} onChange={e => setName(e.target.value)} />
        <input className="w-full mb-2 p-2 rounded bg-gray-700 text-white" placeholder="Catégorie" value={category} onChange={e => setCategory(e.target.value)} />
        <input className="w-full mb-4 p-2 rounded bg-gray-700 text-white" placeholder="Genre" value={gender} onChange={e => setGender(e.target.value)} />
        <div className="flex justify-end gap-2">
          <button className="px-4 py-2 bg-gray-600 rounded hover:bg-gray-500" onClick={onClose}>Annuler</button>
          <button className="px-4 py-2 bg-blue-600 rounded hover:bg-blue-700" onClick={handleSubmit}>Créer</button>
        </div>
      </div>
    </div>
  )
}
