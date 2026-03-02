import { useEffect, useState } from "react"
import { createClient } from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

type Club = {
  id: string
  name: string
  address: string
  created_at: string
}

export default function AdminClubs() {
  const [clubs, setClubs] = useState<Club[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase.from("clubs").select("*")
      if (error) {
        console.error("Erreur en récupérant les clubs :", error)
      } else {
        setClubs(data)
      }
      setLoading(false)
    }
    fetchClubs()
  }, [])

  if (loading) return <p>Chargement des clubs...</p>

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Clubs</h1>
      <table className="w-full table-auto border-collapse border border-gray-400">
        <thead>
          <tr>
            <th className="border border-gray-400 p-2">Nom</th>
            <th className="border border-gray-400 p-2">Adresse</th>
            <th className="border border-gray-400 p-2">Créé le</th>
          </tr>
        </thead>
        <tbody>
          {clubs.map((club) => (
            <tr key={club.id}>
              <td className="border border-gray-400 p-2">{club.name}</td>
              <td className="border border-gray-400 p-2">{club.address}</td>
              <td className="border border-gray-400 p-2">{new Date(club.created_at).toLocaleDateString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
