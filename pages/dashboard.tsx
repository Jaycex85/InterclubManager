// pages/dashboard.tsx
'use client'
import { useEffect, useState } from 'react'
import { supabase } from '../utils/supabaseClient'
import { useRouter } from 'next/router'

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
}

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null)
  const [teams, setTeams] = useState<Team[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const router = useRouter()

  useEffect(() => {
    const getUser = async () => {
      const { data } = await supabase.auth.getUser()
      if (!data.user) router.push('/auth')
      else setUser(data.user)
    }
    getUser()
  }, [router])

  // Placeholder fetch pour teams / matches
  useEffect(() => {
    const fetchTeams = async () => {
      const { data, error } = await supabase.from('teams').select('*')
      if (!error && data) setTeams(data)
    }
    const fetchMatches = async () => {
      const { data, error } = await supabase.from('matches').select('*')
      if (!error && data) setMatches(data)
    }
    fetchTeams()
    fetchMatches()
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth')
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-500">Dashboard</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded font-bold"
        >
          Logout
        </button>
      </div>

      <section className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Teams</h2>
        {teams.length === 0 ? (
          <p className="text-gray-400">No teams yet.</p>
        ) : (
          <ul className="space-y-2">
            {teams.map((team) => (
              <li key={team.id} className="p-4 bg-gray-800 rounded shadow">
                {team.name}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <h2 className="text-2xl font-semibold mb-2">Matches</h2>
        {matches.length === 0 ? (
          <p className="text-gray-400">No matches yet.</p>
        ) : (
          <ul className="space-y-2">
            {matches.map((match) => (
              <li key={match.id} className="p-4 bg-gray-800 rounded shadow">
                <p className="font-bold">{match.opponent}</p>
                <p>
                  {match.match_date} - {match.match_time} ({match.location_type})
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
