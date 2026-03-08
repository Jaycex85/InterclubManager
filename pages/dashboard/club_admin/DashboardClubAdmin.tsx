'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../utils/supabaseClient'

type Club = {
  id: string
  name: string
}

type Team = {
  id: string
  name: string
  club_id: string
}

type User = {
  id: string
  email: string
  first_name?: string
  last_name?: string
}

type Membership = {
  user_id: string
  role: string
  users: User
}

export default function DashboardClubAdmin() {
  const [clubs,setClubs] = useState<Club[]>([])
  const [selectedClub,setSelectedClub] = useState<string | null>(null)

  const [teams,setTeams] = useState<Team[]>([])
  const [members,setMembers] = useState<Membership[]>([])

  const [newTeamName,setNewTeamName] = useState('')
  const [selectedTeam,setSelectedTeam] = useState<string>('')

  const [loading,setLoading] = useState(true)

  useEffect(()=>{ loadClubs() },[])

  const loadClubs = async () => {

    const { data:{user} } = await supabase.auth.getUser()

    if(!user) return

    const { data } = await supabase
    .from('club_memberships')
    .select(`
      role,
      clubs(
        id,
        name
      )
    `)
    .eq('user_id',user.id)

    if(data){

      const allowed = data
      .filter((m:any)=> m.role === 'club_admin' || m.role === 'admin')
      .map((m:any)=> m.clubs)

      setClubs(allowed)

      if(allowed.length){
        setSelectedClub(allowed[0].id)
        loadClubData(allowed[0].id)
      }
    }

    setLoading(false)
  }

  const loadClubData = async (clubId:string) => {

    setSelectedClub(clubId)

    const { data:teamsData } = await supabase
    .from('teams')
    .select('*')
    .eq('club_id',clubId)

    if(teamsData) setTeams(teamsData)

    const { data:membersData } = await supabase
    .from('club_memberships')
    .select(`
      role,
      user_id,
      users(
        id,
        email,
        first_name,
        last_name
      )
    `)
    .eq('club_id',clubId)

    if(membersData) setMembers(membersData as Membership[])
  }

  const createTeam = async () => {

    if(!newTeamName || !selectedClub) return

    await supabase
    .from('teams')
    .insert({
      name:newTeamName,
      club_id:selectedClub
    })

    setNewTeamName('')
    loadClubData(selectedClub)
  }

  const addPlayerToTeam = async (userId:string, role:string) => {

    if(!selectedTeam) return

    await supabase
    .from('team_memberships')
    .insert({
      team_id:selectedTeam,
      user_id:userId,
      role:role
    })
  }

  if(loading) return <div className="p-6 text-white">Chargement...</div>

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">

      <h1 className="text-3xl font-bold text-yellow-400">
        Dashboard Club Admin
      </h1>

      {/* CLUB SELECT */}

      <div>
        <h2 className="text-xl font-bold mb-2">Club</h2>

        <select
        className="bg-gray-800 p-2 rounded"
        value={selectedClub || ''}
        onChange={(e)=>loadClubData(e.target.value)}
        >
          {clubs.map(c=>(
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* TEAMS */}

      <div>

        <h2 className="text-xl font-bold text-green-400 mb-2">
          Équipes
        </h2>

        <div className="space-y-2">

          {teams.map(team=>(
            <div
            key={team.id}
            className="bg-gray-800 p-3 rounded flex justify-between items-center"
            >

              <span>{team.name}</span>

              <button
              onClick={()=>setSelectedTeam(team.id)}
              className="bg-yellow-400 text-black px-3 py-1 rounded"
              >
                Gérer
              </button>

            </div>
          ))}

        </div>

        <div className="mt-3 flex gap-2">

          <input
          value={newTeamName}
          onChange={(e)=>setNewTeamName(e.target.value)}
          placeholder="Nom équipe"
          className="bg-gray-800 p-2 rounded"
          />

          <button
          onClick={createTeam}
          className="bg-green-500 px-3 py-2 rounded"
          >
            Créer
          </button>

        </div>

      </div>

      {/* MEMBERS */}

      <div>

        <h2 className="text-xl font-bold text-blue-400 mb-2">
          Membres du club
        </h2>

        <div className="space-y-2">

          {members.map(m=>{

            const u = m.users

            const name =
            `${u.first_name || ''} ${u.last_name || ''}`.trim()

            return (

              <div
              key={u.id}
              className="bg-gray-800 p-3 rounded flex justify-between items-center"
              >

                <div>

                  <div>{name || u.email}</div>

                  <div className="text-sm text-gray-400">
                    {m.role}
                  </div>

                </div>

                {selectedTeam && (

                  <div className="flex gap-2">

                    <button
                    onClick={()=>addPlayerToTeam(u.id,'player')}
                    className="bg-green-500 px-2 py-1 rounded text-sm"
                    >
                      Joueur
                    </button>

                    <button
                    onClick={()=>addPlayerToTeam(u.id,'captain')}
                    className="bg-orange-500 px-2 py-1 rounded text-sm"
                    >
                      Capitaine
                    </button>

                  </div>

                )}

              </div>

            )
          })}

        </div>

      </div>

    </div>
  )
}
