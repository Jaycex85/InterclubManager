'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardClubAdmin(){

 const [userRole,setUserRole] = useState<string | null>(null)

 const [clubs,setClubs] = useState<any[]>([])
 const [selectedClub,setSelectedClub] = useState<string | null>(null)

 const [teams,setTeams] = useState<any[]>([])
 const [players,setPlayers] = useState<any[]>([])

 const [newTeam,setNewTeam] = useState("")

 useEffect(()=>{

  init()

 },[])

 async function init(){

  const { data:{session} } = await supabase.auth.getSession()

  const { data:user } = await supabase
   .from("users")
   .select("id,role")
   .eq("auth_id",session?.user.id)
   .single()

  setUserRole(user.role)

  let clubsData:any[] = []

  // ADMIN GLOBAL

  if(user.role === "admin"){

   const { data } = await supabase
    .from("clubs")
    .select("id,name")

   clubsData = data || []

  }

  // CLUB ADMIN

  else{

   const { data } = await supabase
    .from("club_memberships")
    .select("club_id,clubs(name)")
    .eq("user_id",user.id)

   clubsData = (data || []).map((c:any)=>({
    id:c.club_id,
    name:c.clubs.name
   }))

  }

  setClubs(clubsData)

  if(clubsData.length > 0){

   setSelectedClub(clubsData[0].id)
   loadClubData(clubsData[0].id)

  }

 }

 async function loadClubData(clubId:string){

  // TEAMS

  const { data:teamsData } = await supabase
   .from("teams")
   .select("*")
   .eq("club_id",clubId)

  setTeams(teamsData || [])

  // PLAYERS

  const { data:playersData } = await supabase
   .from("club_memberships")
   .select("user_id,role,users(name,email)")
   .eq("club_id",clubId)

  setPlayers(playersData || [])

 }

 async function createTeam(){

  if(!newTeam || !selectedClub) return

  await supabase
   .from("teams")
   .insert({
    name:newTeam,
    club_id:selectedClub
   })

  setNewTeam("")

  loadClubData(selectedClub)

 }

 async function addPlayerToTeam(userId:string,teamId:string){

  await supabase
   .from("team_memberships")
   .insert({
    user_id:userId,
    team_id:teamId,
    role:"player"
   })

  alert("Joueur ajouté")

 }

 async function promoteCaptain(userId:string,teamId:string){

  await supabase
   .from("team_memberships")
   .update({ role:"captain" })
   .eq("user_id",userId)
   .eq("team_id",teamId)

  alert("Capitaine défini")

 }

 return(

  <div className="space-y-8">

   <h2 className="text-2xl font-bold text-yellow-400">
    Gestion des Clubs
   </h2>

   {/* SELECT CLUB */}

   {clubs.length > 1 && (

    <div className="bg-gray-800 p-4 rounded">

     <label className="block mb-2 font-bold">
      Choisir un club
     </label>

     <select
      value={selectedClub || ""}
      onChange={(e)=>{
       setSelectedClub(e.target.value)
       loadClubData(e.target.value)
      }}
      className="text-black p-2 rounded w-full"
     >

      {clubs.map(c=>(
       <option key={c.id} value={c.id}>
        {c.name}
       </option>
      ))}

     </select>

    </div>

   )}

   {/* CREATE TEAM */}

   <div className="bg-gray-800 p-4 rounded">

    <h3 className="font-bold mb-2">
     Créer une équipe
    </h3>

    <div className="flex gap-2">

     <input
      value={newTeam}
      onChange={(e)=>setNewTeam(e.target.value)}
      placeholder="Nom de l'équipe"
      className="text-black p-2 rounded w-full"
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

    {teams.length === 0 && (
     <div>Aucune équipe</div>
    )}

    {teams.map(team=>(
     <div key={team.id} className="mb-6">

      <div className="text-yellow-300 font-bold mb-2">
       {team.name}
      </div>

      {players.map((p:any)=>(
       <div
        key={p.user_id}
        className="flex justify-between bg-gray-700 p-2 rounded mb-1"
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
    ))}

   </div>

   {/* PLAYERS */}

   <div className="bg-gray-800 p-4 rounded">

    <h3 className="font-bold mb-4">
     Joueurs du club
    </h3>

    {players.map((p:any)=>(
     <div
      key={p.user_id}
      className="bg-gray-700 p-2 rounded mb-1"
     >
      {p.users?.name || p.users?.email}
     </div>
    ))}

   </div>

  </div>

 )
}
