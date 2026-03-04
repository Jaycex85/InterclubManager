'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from '../../../../utils/supabaseClient'

type User = {
  id?: string
  email: string
  role: "admin" | "club_admin" | "player" | "capitaine"
}

type Club = {
  id: string
  name: string
}

type Membership = {
  club_id: string
  role: "member" | "club_admin"
}

export default function AdminUserForm() {
  const router = useRouter()
  const { id } = router.query

  const [user, setUser] = useState<User>({ email: "", role: "player" })
  const [clubs, setClubs] = useState<Club[]>([])
  const [memberships, setMemberships] = useState<Membership[]>([])
  const [loading, setLoading] = useState(false)

  // Fetch clubs et user si editing
  useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase.from('clubs').select('*').order('name')
      if (error) console.error(error)
      else setClubs(data || [])
    }

    const fetchUser = async () => {
      if (!id || id === 'new') return
      setLoading(true)
      const { data: userData, error: userError } = await supabase.from('users').select('*').eq('id', id).single()
      if (userError) console.error(userError)
      else if (userData) setUser({ email: userData.email, role: userData.role })

      const { data: membershipsData } = await supabase.from('club_memberships').select('*').eq('user_id', id)
      if (membershipsData) setMemberships(membershipsData.map(m => ({ club_id: m.club_id, role: m.role })))
      setLoading(false)
    }

    fetchClubs()
    fetchUser()
  }, [id])

  const handleMembershipChange = (clubId: string, isAdmin: boolean) => {
    setMemberships(prev => {
      const existing = prev.find(m => m.club_id === clubId)
      if (existing) {
        // Met à jour le rôle
        return prev.map(m => m.club_id === clubId ? { ...m, role: isAdmin ? "club_admin" : "member" } : m)
      } else {
        // Ajoute la membership
        return [...prev, { club_id: clubId, role: isAdmin ? "club_admin" : "member" }]
      }
    })
  }

  const handleRemoveMembership = (clubId: string) => {
    setMemberships(prev => prev.filter(m => m.club_id !== clubId))
  }

  const handleChangeUser = (field: keyof User, value: string) => {
    setUser(prev => ({ ...prev, [field]: value } as User))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      let userId = id
      if (id === 'new') {
        const { data: newUser, error } = await supabase.from('users').insert([user]).select().single()
        if (error) throw error
        userId = newUser.id
      } else {
        const { error } = await supabase.from('users').update(user).eq('id', id)
        if (error) throw error
      }

      // Supprime toutes les memberships existantes
      const { error: delError } = await supabase.from('club_memberships').delete().eq('user_id', userId)
      if (delError) throw delError

      // Insert memberships mises à jour
      if (memberships.length > 0) {
        const toInsert = memberships.map(m => ({ ...m, user_id: userId }))
        const { error: insertError } = await supabase.from('club_memberships').insert(toInsert)
        if (insertError) throw insertError
      }

      router.push('/dashboard/admin/users')
    } catch (error: any) {
      alert(error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        {id === 'new' ? "Créer un utilisateur" : "Éditer utilisateur"}
      </h1>

      {loading ? (
        <p>Chargement...</p>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4 max-w-lg">
          <div>
            <label className="block mb-1">Email</label>
            <input
              type="email"
              value={user.email}
              onChange={e => handleChangeUser('email', e.target.value)}
              required
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Role global</label>
            <select
              value={user.role}
              onChange={e => handleChangeUser('role', e.target.value)}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="admin">Admin</option>
              <option value="club_admin">Club Admin</option>
              <option value="player">Player</option>
              <option value="capitaine">Capitaine</option>
            </select>
          </div>

          <div>
            <p className="mb-2 font-bold">Clubs</p>
            {clubs.map(club => {
              const membership = memberships.find(m => m.club_id === club.id)
              return (
                <div key={club.id} className="flex items-center gap-4 mb-2">
                  {/* Checkbox “lié au club” */}
                  <label className="flex items-center gap-1">
                    <input
                      type="checkbox"
                      checked={!!membership}
                      onChange={e => {
                        if (e.target.checked) handleMembershipChange(club.id, membership?.role === "club_admin")
                        else handleRemoveMembership(club.id)
                      }}
                    />
                    {club.name}
                  </label>

                  {/* Club Admin uniquement si lié */}
                  {membership && (
                    <label className="flex items-center gap-1 ml-4">
                      <input
                        type="checkbox"
                        checked={membership.role === "club_admin"}
                        onChange={e => handleMembershipChange(club.id, e.target.checked)}
                      />
                      Club Admin
                    </label>
                  )}
                </div>
              )
            })}
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          >
            {id === 'new' ? "Créer l'utilisateur" : "Mettre à jour"}
          </button>
        </form>
      )}
    </div>
  )
}
