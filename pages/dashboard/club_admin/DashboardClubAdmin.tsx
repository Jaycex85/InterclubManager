'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardClubAdmin() {

 const [clubId,setClubId] = useState<string | null>(null)

 const [teams,setTeams] = useState<any[]>([])
 const [players,setPlayers] = useState<any[]>([])

 const [newTeam,setNewTeam] = useState("")

 useEffect(()=>{

  loadData()

 },[])

 const loadData = async()=>{

  const { data:{session} } = await supabase.auth.getSession()

  const { data:user } = await supabase
   .from("users")
   .select("id")
   .eq("auth_id",session?.user.id)
   .single()

  const { data:club } = await supabase
   .from("club_memberships")
   .select("club_id")
   .eq("user_id",user.id)
   .limit(1)
   .single()

  setClubId(club.club_id)

  const { data:teamsData } = await supabase
   .from("teams")
   .select("*")
   .eq("club_id",club.club_id)

  setTeams(teamsData || [])

  const { data:playersData } = await supabase
   .from("club_memberships")
   .select("user_id, users(name,email)")
   .eq("club_id",club.club_id)

  setPlayers(playersData || [])

 }

 const createTeam = async()=>{

  if(!newTeam) return

  await supabase
   .from("teams")
   .insert({
    name:newTeam,
    club_id:clubId
   })

  setNewTeam("")
  loadData()

 }

 const addPlayerToTeam = async(userId:string,teamId:string)=>{

  await supabase
   .from("team_memberships")
   .insert({
    user_id:userId,
    team_id:teamId,
    role:"player"
   })

  alert("Joueur ajouté")

 }

 const promoteCaptain = async(userId:string,teamId:string)=>{

  await supabase
   .from("team_memberships")
   .update({ role:"captain" })
   .eq("user_id",userId)
   .eq("team_id",teamId)

  alert("Capitaine défini")

 }

 return(

  <div className="space-y-8">

   <h2 className="text-xl font-bold text-yellow-400">
    Gestion du Club
   </h2>

   {/* CREATE TEAM */}

   <div className="bg-gray-800 p-4 rounded">

    <h3 className="font-bold mb-2">
     Créer une équipe
    </h3>

    <div className="flex gap-2">

     <input
      className="text-black p-2 rounded w-full"
      value={newTeam}
      onChange={(e)=>setNewTeam(e.target.value)}
      placeholder="Nom équipe"
     />

     <button
      onClick={createTeam}
      className="bg-yellow-500 text-black px-4 rounded"
     >
      Créer
     </button>

    </div>

   </div>

   {/* TEAMS */}

   <div className="bg-gray-800 p-4 rounded">

    <h3 className="font-bold mb-4">
     Équipes du club
    </h3>

    {teams.map(team=>(
     <div key={team.id} className="mb-6">

      <div className="font-bold text-yellow-300">
       {team.name}
      </div>

      <div className="mt-2 space-y-1">

       {players.map((p:any)=>(
        <div
         key={p.user_id}
         className="flex justify-between bg-gray-700 p-2 rounded"
        >

         <span>
          {p.users?.name || p.users?.email}
         </span>

         <div className="flex gap-2">

          <button
           onClick={()=>addPlayerToTeam(p.user_id,team.id)}
           className="bg-green-500 text-black px-2 rounded"
          >
           Ajouter
          </button>

          <button
           onClick={()=>promoteCaptain(p.user_id,team.id)}
           className="bg-blue-500 text-black px-2 rounded"
          >
           Capitaine
          </button>

         </div>

        </div>
       ))}

      </div>

     </div>
    ))}

   </div>

  </div>
 )
}
