'use client'

import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
 process.env.NEXT_PUBLIC_SUPABASE_URL!,
 process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

export default function DashboardClubAdmin(){

 const [clubs,setClubs] = useState<any[]>([])
 const [selectedClub,setSelectedClub] = useState<string | null>(null)

 const [teams,setTeams] = useState<any[]>([])
 const [players,setPlayers] = useState<any[]>([])
 const [teamMembers,setTeamMembers] = useState<any[]>([])

 const [newTeam,setNewTeam] = useState("")
 const [newCategory,setNewCategory] = useState("Senior")

 const [teamCount,setTeamCount] = useState(0)
 const [playerCount,setPlayerCount] = useState(0)

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

  let clubsData:any[] = []

  if(user.role === "admin"){

   const { data } = await supabase
    .from("clubs")
    .select("id,name")

   clubsData = data || []

  }else{

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

  const { data:teamsData } = await supabase
   .from("teams")
   .select("id,name,category")
   .eq("club_id",clubId)

  const { data:playersData } = await supabase
   .from("club_memberships")
   .select("user_id,users(name,email)")
   .eq("club_id",clubId)

  const { data:membersData } = await supabase
   .from("team_memberships")
   .select("*")

  setTeams(teamsData || [])
  setPlayers(playersData || [])
  setTeamMembers(membersData || [])

  setTeamCount(teamsData?.length || 0)
  setPlayerCount(playersData?.length || 0)

 }

 async function createTeam(){

  if(!newTeam || !selectedClub) return

  await supabase.from("teams").insert({

   name:newTeam,
   category:newCategory,
   club_id:selectedClub

  })

  setNewTeam("")
  loadClubData(selectedClub)

 }

 async function deleteTeam(teamId:string){

  await supabase.from("teams").delete().eq("id",teamId)

  loadClubData(selectedClub!)

 }

 async function addPlayerToTeam(userId:string,teamId:string){

  await supabase.from("team_memberships").insert({

   user_id:userId,
   team_id:teamId,
   role:"player"

  })

  loadClubData(selectedClub!)

 }

 async function removePlayer(userId:string,teamId:string){

  await supabase
   .from("team_memberships")
   .delete()
   .eq("user_id",userId)
   .eq("team_id",teamId)

  loadClubData(selectedClub!)

 }

 async function setCaptain(userId:string,teamId:string){

  await supabase
   .from("team_memberships")
   .update({role:"player"})
   .eq("team_id",teamId)

  await supabase
   .from("team_memberships")
   .update({role:"captain"})
   .eq("user_id",userId)
   .eq("team_id",teamId)

  loadClubData(selectedClub!)

 }

 return(

 <div className="space-y-6">

 <h2 className="text-2xl font-bold text-yellow-400">
 Gestion Club
 </h2>

 {/* STATS */}

 <div className="grid grid-cols-2 gap-4">

 <div className="bg-gray-800 p-4 rounded">
 <div className="text-gray-400">Equipes</div>
 <div className="text-2xl font-bold">{teamCount}</div>
 </div>

 <div className="bg-gray-800 p-4 rounded">
 <div className="text-gray-400">Joueurs</div>
 <div className="text-2xl font-bold">{playerCount}</div>
 </div>

 </div>

 {/* SELECT CLUB */}

 {clubs.length > 1 && (

 <select
 value={selectedClub || ""}
 onChange={(e)=>{
 setSelectedClub(e.target.value)
 loadClubData(e.target.value)
 }}
 className="text-black p-2 rounded"
 >

 {clubs.map(c=>(
 <option key={c.id} value={c.id}>
 {c.name}
 </option>
 ))}

 </select>

 )}

 {/* CREATE TEAM */}

 <div className="bg-gray-800 p-4 rounded space-y-2">

 <h3 className="font-bold">Créer une équipe</h3>

 <input
 value={newTeam}
 onChange={(e)=>setNewTeam(e.target.value)}
 placeholder="Nom équipe"
 className="text-black p-2 rounded w-full"
 />

 <select
 value={newCategory}
 onChange={(e)=>setNewCategory(e.target.value)}
 className="text-black p-2 rounded w-full"
 >
 <option>Senior</option>
 <option>U18</option>
 <option>U15</option>
 <option>Loisir</option>
 </select>

 <button
 onClick={createTeam}
 className="bg-yellow-500 text-black px-4 py-2 rounded"
 >
 Créer équipe
 </button>

 </div>

 {/* TEAMS */}

 {teams.map(team=>{

 const members = teamMembers.filter(
 m=>m.team_id === team.id
 )

 return(

 <div key={team.id} className="bg-gray-800 p-4 rounded space-y-2">

 <div className="flex justify-between">

 <div className="font-bold text-yellow-300">
 {team.name} ({team.category})
 </div>

 <button
 onClick={()=>deleteTeam(team.id)}
 className="bg-red-500 px-2 rounded"
 >
 Supprimer
 </button>

 </div>

 {/* MEMBERS */}

 {members.map(m=>{

 const player = players.find(
 p=>p.user_id === m.user_id
 )

 return(

 <div
 key={m.user_id}
 className="flex justify-between bg-gray-700 p-2 rounded"
 >

 <span>
 {player?.users?.name || player?.users?.email}
 {m.role === "captain" && " (Capitaine)"}
 </span>

 <div className="flex gap-2">

 <button
 onClick={()=>setCaptain(m.user_id,team.id)}
 className="bg-blue-500 px-2 rounded"
 >
 Capitaine
 </button>

 <button
 onClick={()=>removePlayer(m.user_id,team.id)}
 className="bg-red-500 px-2 rounded"
 >
 Retirer
 </button>

 </div>

 </div>

 )

 })}

 {/* ADD PLAYERS */}

 <div className="mt-2">

 {players.map(p=>{

 const already = members.find(
 m=>m.user_id === p.user_id
 )

 if(already) return null

 return(

 <div
 key={p.user_id}
 className="flex justify-between bg-gray-700 p-2 rounded mb-1"
 >

 <span>
 {p.users?.name || p.users?.email}
 </span>

 <button
 onClick={()=>addPlayerToTeam(p.user_id,team.id)}
 className="bg-green-500 px-2 rounded"
 >
 Ajouter
 </button>

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
