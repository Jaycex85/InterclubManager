'use client'

import { useState } from "react"
import dynamic from "next/dynamic"

// Chargement dynamique des pages existantes
const ClubsIndex = dynamic(() => import("./clubs/index"), { ssr: false })
const TeamsIndex = dynamic(() => import("./teams/index"), { ssr: false })
// PlayersIndex n'existe pas encore, on met un placeholder
const PlayersIndex = () => (
  <div className="p-4 text-gray-300">
    Gestion des joueurs à venir...
  </div>
)

type Panel = "home" | "clubs" | "teams" | "players"

export default function AdminDashboard() {
  const [activePanel, setActivePanel] = useState<Panel>("home")

  const renderPanel = () => {
    switch (activePanel) {
      case "clubs":
        return <ClubsIndex />
      case "teams":
        return <TeamsIndex />
      case "players":
        return <PlayersIndex />
      case "home":
      default:
        return (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={() => setActivePanel("clubs")}
              className="bg-yellow-500 hover:bg-yellow-600 p-6 rounded shadow text-black font-bold text-xl"
            >
              Clubs
            </button>
            <button
              onClick={() => setActivePanel("teams")}
              className="bg-green-500 hover:bg-green-600 p-6 rounded shadow text-black font-bold text-xl"
            >
              Teams
            </button>
            <button
              onClick={() => setActivePanel("players")}
              className="bg-blue-500 hover:bg-blue-600 p-6 rounded shadow text-black font-bold text-xl"
            >
              Players
            </button>
          </div>
        )
    }
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-yellow-400">Admin Dashboard</h1>
        {activePanel !== "home" && (
          <button
            onClick={() => setActivePanel("home")}
            className="bg-gray-700 hover:bg-gray-800 px-4 py-2 rounded"
          >
            ← Retour aux tuiles
          </button>
        )}
      </div>

      <div>
        {renderPanel()}
      </div>
    </div>
  )
}
