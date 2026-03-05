'use client'

import { useEffect, useState } from 'react'
import dynamic from 'next/dynamic'
import { supabase } from '../../../utils/supabaseClient'
import { MdSportsTennis } from 'react-icons/md'
import { FaUsers } from 'react-icons/fa'
import { IoMdAddCircle } from 'react-icons/io'

const MatchForm = dynamic(() => import('./matches/EditMatch'), { ssr: false })
const CompositionForm = dynamic(() => import('./matches/EditComposition'), { ssr: false })

type Team = {
  id: string
  name: string
}

type Match = {
  id: string
  team_id: string
  opponent: string
  match_date: string
  match_time: string
  location_type: string
  clubadress: string
  composition_validated: boolean
}

export default function DashboardCapitaine() {

  const [teams,setTeams] = useState<Team[]>([])
  const [matches,setMatches] = useState<Match[]>([])

  const [openTeam,setOpenTeam] = useState<string|null>(null)

  const [openMatchModal,setOpenMatchModal] = useState<string|null>(null)
  const [openCompositionModal,setOpenCompositionModal] = useState<string|null>(null)

  const [createMatchTeam,setCreateMatchTeam] = useState<string|null>(null)

  const [userId,setUserId] = useState<string|null>(null)

  /** USER **/
  const fetchUser = async () => {

    const { data:{session} } = await supabase.auth.getSession()

    if(!session) return

    const { data } = await supabase
      .from('users')
      .select('id')
      .eq('auth_id',session.user.id)
      .single()

    if(data) setUserId(data.id)

  }

  /** TEAMS **/
  const fetchTeams = async () => {

    if(!userId) return

    const { data,error } = await supabase
      .from('team_memberships')
      .select(`
        team_id,
        teams(
          id,
          name
        )
      `)
      .eq('user_id',userId)
      .eq('role','captain')

    if(!error && data){

      const formatted = data.map((t:any)=>({
        id:t.teams.id,
        name:t.teams.name
      }))

      setTeams(formatted)

    }

  }

  /** MATCHES **/
  const fetchMatches = async () => {

    const { data,error } = await supabase
      .from('matches')
      .select('*')
      .order('match_date',{ascending:true})

    if(!error) setMatches(data || [])

  }

  useEffect(()=>{
    fetchUser()
  },[])

  useEffect(()=>{
    if(userId){
      fetchTeams()
      fetchMatches()
    }
  },[userId])


  /** COLOR LOGIC **/

  const matchColor = (m:Match)=>{

    if(m.composition_validated)
      return "bg-green-700 hover:bg-green-600"

    const today = new Date().toISOString().split('T')[0]

    if(m.match_date >= today)
      return "bg-yellow-700 hover:bg-yellow-600"

    return "bg-gray-700 hover:bg-gray-600"

  }


  return (

    <div className="space-y-4">

      {teams.map(team=>(
        <div key={team.id} className="border border-gray-700 rounded overflow-hidden">

          {/* HEADER */}
          <button
            className="w-full text-left p-4 bg-gray-800 hover:bg-gray-700 font-bold flex justify-between items-center"
            onClick={()=>setOpenTeam(openTeam===team.id?null:team.id)}
          >

            <span className="flex items-center text-yellow-400">
              <MdSportsTennis className="mr-2"/>
              {team.name}
            </span>

            <span className={`transform transition ${openTeam===team.id?'rotate-180':''}`}>
              ▼
            </span>

          </button>

          {/* CONTENT */}
          {openTeam===team.id && (

            <div className="p-4 space-y-2">

              {/* CREATE MATCH */}
              <button
                className="flex items-center text-green-400 hover:text-green-300"
                onClick={()=>setCreateMatchTeam(team.id)}
              >
                <IoMdAddCircle className="mr-2"/>
                Créer un match
              </button>

              {matches
                .filter(m=>m.team_id===team.id)
                .map(m=>(
                  <div
                    key={m.id}
                    className={`p-3 rounded flex justify-between items-center ${matchColor(m)}`}
                  >

                    <button
                      className="text-left flex-1"
                      onClick={()=>setOpenMatchModal(m.id)}
                    >

                      <div className="font-bold">
                        {m.match_date} {m.match_time}
                      </div>

                      <div className="text-sm opacity-80">
                        vs {m.opponent} ({m.location_type})
                      </div>

                    </button>

                    {/* COMPOSITION */}
                    <button
                      className="ml-3 text-white hover:text-yellow-300"
                      onClick={()=>setOpenCompositionModal(m.id)}
                    >
                      <FaUsers/>
                    </button>

                  </div>
                ))}

            </div>

          )}

        </div>
      ))}



      {/* CREATE MATCH */}
      {createMatchTeam && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">

          <div className="bg-gray-800 p-6 rounded w-full max-w-lg">

            <MatchForm
              teamId={createMatchTeam}
              onSaved={()=>{
                fetchMatches()
                setCreateMatchTeam(null)
              }}
              onClose={()=>setCreateMatchTeam(null)}
            />

          </div>

        </div>

      )}


      {/* EDIT MATCH */}
      {openMatchModal && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">

          <div className="bg-gray-800 p-6 rounded w-full max-w-lg">

            <MatchForm
              matchId={openMatchModal}
              onSaved={()=>{
                fetchMatches()
                setOpenMatchModal(null)
              }}
              onClose={()=>setOpenMatchModal(null)}
            />

          </div>

        </div>

      )}



      {/* COMPOSITION */}
      {openCompositionModal && (

        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">

          <div className="bg-gray-800 p-6 rounded w-full max-w-lg">

            <CompositionForm
              matchId={openCompositionModal}
              onSaved={()=>{
                fetchMatches()
                setOpenCompositionModal(null)
              }}
              onClose={()=>setOpenCompositionModal(null)}
            />

          </div>

        </div>

      )}

    </div>
  )

}
