import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/router'

export default function Dashboard() {
  const [teams, setTeams] = useState([])
  const router = useRouter()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) router.push('/auth')
    })
    fetchTeams()
  }, [])

  const fetchTeams = async () => {
    const { data } = await supabase.from('teams').select('*')
    setTeams(data || [])
  }

  return (
    <div className="min-h-screen p-6 bg-gray-900 text-white">
      <h1 className="text-3xl mb-6">Dashboard</h1>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {teams.map((team: any) => (
          <div key={team.id} className="p-4 bg-gray-800 rounded shadow">
            <h2 className="text-xl font-bold">{team.name}</h2>
            <p>Club ID: {team.club_id}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
