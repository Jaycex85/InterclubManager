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
  user: User
}

export default function DashboardClubAdmin() {

  const [clubs,setClubs] = useState<Club[]>([])
  const [selectedClub,setSelectedClub] = useState<string | null>(null)

  const [teams,setTeams] = useState<Team[]>([])
  const [members,setMembers] = useState<Membership[]>([])

  const [loading,setLoading] = useState(true)

  const [showCreateTeamModal,setShowCreateTeamModal] = useState(false)
  const [showManageTeamModal,setShowManageTeamModal] = useState(false)

  const [newTeamName,setNewTeamName] = useState('')

  const [teamToManage,setTeamToManage] = useState<Team | null>(null)
  const [teamMembers,setTeamMembers] = useState<Membership[]>([])

  useEffect(()=>{
    loadClubs()
  },[])

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

    if(membersData){

      const formatted:Membership[] = membersData.map((m:any)=>({

        user_id:m.user_id,
        role:m.role,
        user:{
          id:m.users?.id || m.users?.[0]?.id,
          email:m.users?.email || m.users?.[0]?.email,
          first_name:m.users?.first_name || m.users?.[0]?.first_name,
          last_name:m.users?.last_name || m.users?.[0]?.last_name
        }

      }))

      setMembers(formatted)
    }
  }

  const createTeam = async () => {

    if(!selectedClub || !newTeamName) return

    await supabase
    .from('teams')
    .insert({
      name:newTeamName,
      club_id:selectedClub
    })

    setNewTeamName('')
    setShowCreateTeamModal(false)

    loadClubData(selectedClub)
  }

  const loadTeamMembers = async (teamId:string) => {

    const { data } = await supabase
    .from('team_memberships')
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
    .eq('team_id',teamId)

    if(data){

      const formatted = data.map((m:any)=>({

        user_id:m.user_id,
        role:m.role,
        user:{
          id:m.users?.id || m.users?.[0]?.id,
          email:m.users?.email || m.users?.[0]?.email,
          first_name:m.users?.first_name || m.users?.[0]?.first_name,
          last_name:m.users?.last_name || m.users?.[0]?.last_name
        }

      }))

      setTeamMembers(formatted)
    }
  }

  const addPlayerToTeam = async (userId:string,role:string) => {

    if(!teamToManage) return

    await supabase
    .from('team_memberships')
    .insert({
      team_id:teamToManage.id,
      user_id:userId,
      role
    })

    loadTeamMembers(teamToManage.id)
  }

  if(loading) return <div className="p-6 text-white">Chargement...</div>

  return (

  <div className="min-h-screen bg-gray-900 text-white p-6 space-y-6">

  <h1 className="text-3xl font-bold text-yellow-400">
  Dashboard Club Admin
  </h1>

{/* CLUB */}

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

{/* TEAMS */}

<div>

<h2 className="text-xl font-bold text-green-400 mb-2">
Équipes
</h2>

{teams.map(team=>(

<div
key={team.id}
className="bg-gray-800 p-3 rounded flex justify-between mb-2"
>

<span>{team.name}</span>

<button
onClick={()=>{
setTeamToManage(team)
loadTeamMembers(team.id)
setShowManageTeamModal(true)
}}
className="bg-yellow-400 text-black px-3 py-1 rounded"
>
Gérer
</button>

</div>

))}

<button
onClick={()=>setShowCreateTeamModal(true)}
className="bg-green-500 px-3 py-2 rounded mt-2"
>
Créer équipe
</button>

</div>

{/* MEMBERS */}

<div>

<h2 className="text-xl font-bold text-blue-400 mb-2">
Membres du club
</h2>

{members.map(m=>{

const name =
`${m.user.first_name || ''} ${m.user.last_name || ''}`.trim()

return(

<div
key={m.user.id}
className="bg-gray-800 p-2 rounded mb-1"
>

{name || m.user.email}

</div>

)

})}

</div>

{/* MODAL CREATE TEAM */}

{showCreateTeamModal && (

<div className="fixed inset-0 bg-black/70 flex items-center justify-center">

<div className="bg-gray-800 p-6 rounded w-96 space-y-4">

<h2 className="text-xl font-bold text-yellow-400">
Créer équipe
</h2>

<input
value={newTeamName}
onChange={(e)=>setNewTeamName(e.target.value)}
className="bg-gray-700 p-2 rounded w-full"
placeholder="Nom équipe"
/>

<div className="flex justify-end gap-2">

<button
onClick={()=>setShowCreateTeamModal(false)}
className="bg-gray-600 px-3 py-1 rounded"
>
Annuler
</button>

<button
onClick={createTeam}
className="bg-green-500 px-3 py-1 rounded"
>
Créer
</button>

</div>

</div>

</div>

)}

{/* MODAL MANAGE TEAM */}

{showManageTeamModal && teamToManage && (

<div className="fixed inset-0 bg-black/70 flex items-center justify-center">

<div className="bg-gray-800 p-6 rounded w-[600px] max-h-[80vh] overflow-y-auto">

<h2 className="text-xl font-bold text-yellow-400 mb-4">
Gestion équipe : {teamToManage.name}
</h2>

<h3 className="font-bold mb-2">Membres</h3>

{teamMembers.map(m=>{

const name =
`${m.user.first_name || ''} ${m.user.last_name || ''}`.trim()

return(

<div
key={m.user.id}
className="flex justify-between bg-gray-700 p-2 rounded mb-1"
>

<span>{name || m.user.email}</span>

<span className="text-yellow-300 text-sm">
{m.role}
</span>

</div>

)

})}

<h3 className="font-bold mt-4 mb-2">
Ajouter joueur
</h3>

{members.map(m=>{

const name =
`${m.user.first_name || ''} ${m.user.last_name || ''}`.trim()

return(

<div
key={m.user.id}
className="flex justify-between bg-gray-700 p-2 rounded mb-1"
>

<span>{name || m.user.email}</span>

<div className="flex gap-2">

<button
onClick={()=>addPlayerToTeam(m.user.id,'player')}
className="bg-green-500 px-2 py-1 rounded text-sm"
>
Player
</button>

<button
onClick={()=>addPlayerToTeam(m.user.id,'captain')}
className="bg-orange-500 px-2 py-1 rounded text-sm"
>
Captain
</button>

</div>

</div>

)

})}

<button
onClick={()=>setShowManageTeamModal(false)}
className="bg-red-500 px-3 py-1 rounded mt-4"
>
Fermer
</button>

</div>

</div>

)}

</div>

)
}
