'use client'

import { useEffect, useState } from "react"
import { useRouter } from "next/router"
import { supabase } from '../../../../utils/supabaseClient'

type User = {
  id?: string
  email: string
  role: "admin" | "user"
}

type Club = {
  id: string
  name: string
}

type ClubMembership = {
  club_id: string
  role: "member" | "club_admin"
}

export default function AdminUserFormPage() {
  const router = useRouter()
  const { id } = router.query

  const [user, setUser] = useState<User>({
    email: "",
    role: "user"
  })

  const [clubs, setClubs] = useState<Club[]>([])
  const [memberships, setMemberships] = useState<ClubMembership[]>([])
  const [loading, setLoading] = useState(false)

  // Récupère la liste des clubs
  useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase.from("clubs").select("*").order("name")
      if (error) console.error(error)
      else setClubs(data)
    }
    fetchClubs()
  }, [])

  // Récupère le user et ses memberships si édition
  useEffect(() => {
    if (!id || id === "new") return

    const fetchUser = async () => {
      setLoading(true)
      // User
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single()
      if (userError) console.error(userError)
      else if (userData) setUser(userData)

      // Club memberships
      const { data: membershipsData, error: membershipsError } = await supabase
        .from("club_memberships")
        .select("*")
        .eq("user_id", id)
      if (membershipsError) console.error(membershipsError)
      else if (membershipsData) setMemberships(membershipsData)
      setLoading(false)
    }

    fetchUser()
  }, [id])

  const handleMembershipChange = (clubId: string, isClubAdmin: boolean) => {
    setMemberships(prev => {
      // Déjà présent ?
      const existing = prev.find(m => m.club_id === clubId)
      if (existing) {
        return prev.map(m =>
          m.club_id === clubId ? { ...m, role: isClubAdmin ? "club_admin" : "member" } : m
        )
      } else {
        return [...prev, { club_id: clubId, role: isClubAdmin ? "club_admin" : "member" }]
      }
    })
  }

  const handleRemoveMembership = (clubId: string) => {
    setMemberships(prev => prev.filter(m => m.club_id !== clubId))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    if (id === "new") {
      // Crée le user
      const { data: newUser, error: userError } = await supabase.from("users").insert([user]).select().single()
      if (userError) {
        alert(userError.message)
        setLoading(false)
        return
      }
      // Crée ses memberships
      for (const m of memberships) {
        const { error } = await supabase.from("club_memberships").insert([{ ...m, user_id: newUser.id }])
        if (error) console.error(error)
      }
    } else {
      // Update user
      const { error: userError } = await supabase.from("users").update(user).eq("id", id)
      if (userError) alert(userError.message)

      // Supprime toutes les memberships existantes pour ce user
      const { error: deleteError } = await supabase.from("club_memberships").delete().eq("user_id", id)
      if (deleteError) console.error(deleteError)

      // Insert memberships à jour
      for (const m of memberships) {
        const { error } = await supabase.from("club_memberships").insert([{ ...m, user_id: id }])
        if (error) console.error(error)
      }
    }

    router.push("/dashboard/admin/users")
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <h1 className="text-3xl font-bold text-yellow-500 mb-6">
        {id === "new" ? "Créer un utilisateur" : "Éditer l'utilisateur"}
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
              onChange={e => setUser({ ...user, email: e.target.value })}
              required
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            />
          </div>

          <div>
            <label className="block mb-1">Rôle global</label>
            <select
              value={user.role}
              onChange={e => setUser({ ...user, role: e.target.value as "admin" | "user" })}
              className="w-full p-2 rounded bg-gray-800 border border-gray-700"
            >
              <option value="user">Utilisateur</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div>
            <label className="block mb-2 font-bold">Clubs liés</label>
            <div className="space-y-2">
              {clubs.map(club => {
                const membership = memberships.find(m => m.club_id === club.id)
                return (
                  <div key={club.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={!!membership}
                      onChange={e =>
                        e.target.checked
                          ? handleMembershipChange(club.id, false)
                          : handleRemoveMembership(club.id)
                      }
                    />
                    <span>{club.name}</span>
                    {membership && (
                      <label className="ml-4 flex items-center gap-1">
                        <input
                          type="checkbox"
                          checked={membership.role === "club_admin"}
                          onChange={e =>
                            handleMembershipChange(club.id, e.target.checked)
                          }
                        />
                        Club Admin
                      </label>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <button
            type="submit"
            className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded font-bold"
          >
            {id === "new" ? "Créer l'utilisateur" : "Mettre à jour"}
          </button>
        </form>
      )}
    </div>
  )
}
