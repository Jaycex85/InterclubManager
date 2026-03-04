'use client'

import { useState, useRef, useEffect } from "react"
import dynamic from "next/dynamic"

// Chargement dynamique des composants existants
const ClubsIndex = dynamic(() => import("./clubs/index"), { ssr: false })
const TeamsIndex = dynamic(() => import("./teams/index"), { ssr: false })
const UsersIndex = dynamic(() => import("./users/index"), { ssr: false }) // Nouveau panel Users

// Placeholder pour Players (à compléter plus tard)
const PlayersIndex = () => (
  <div className="p-4 text-gray-300">
    Gestion des joueurs à venir...
  </div>
)

type PanelKey = "clubs" | "teams" | "players" | "users"

export default function AdminDashboard() {
  // Panels ouverts (multi)
  const [openPanels, setOpenPanels] = useState<PanelKey[]>([])

  // Refs pour chaque panel pour scroll
  const panelRefs = {
    clubs: useRef<HTMLDivElement>(null),
    teams: useRef<HTMLDivElement>(null),
    players: useRef<HTMLDivElement>(null),
    users: useRef<HTMLDivElement>(null),
  }

  const togglePanel = (panel: PanelKey) => {
    setOpenPanels(prev =>
      prev.includes(panel) ? prev.filter(p => p !== panel) : [...prev, panel]
    )
  }

  // Scroll vers le panel ouvert
  useEffect(() => {
    openPanels.forEach(panel => {
      const ref = panelRefs[panel].current
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "start" })
      }
    })
  }, [openPanels])

  // Hook interne pour animation slide-down
  const useSlideDown = (isOpen: boolean) => {
    const ref = useRef<HTMLDivElement>(null)
    const [height, setHeight] = useState<string>("0px")

    useEffect(() => {
      if (ref.current) {
        setHeight(isOpen ? `${ref.current.scrollHeight}px` : "0px")
      }
    }, [isOpen])

    return { ref, style: { maxHeight: height, transition: "max-height 0.35s ease" } }
  }

  const panels: {
    key: PanelKey
    label: string
    component: JSX.Element
    color: string
  }[] = [
    { key: "clubs", label: "Clubs", component: <ClubsIndex />, color: "bg-yellow-500 hover:bg-yellow-600" },
    { key: "teams", label: "Teams", component: <TeamsIndex />, color: "bg-green-500 hover:bg-green-600" },
    { key: "players", label: "Players", component: <PlayersIndex />, color: "bg-blue-500 hover:bg-blue-600" },
    { key: "users", label: "Users", component: <UsersIndex />, color: "bg-purple-500 hover:bg-purple-600" }, // Users ajouté
  ]

  return (
    <div className="min-h-screen bg-gray-900 text-white p-4 md:p-6">
      <h1 className="text-3xl font-bold text-yellow-400 mb-6 text-center md:text-left">
        Admin Dashboard
      </h1>

      <div className="space-y-4 md:space-y-6">
        {panels.map(({ key, label, component, color }) => {
          const isOpen = openPanels.includes(key)
          const { ref, style } = useSlideDown(isOpen)

          return (
            <div key={key} ref={panelRefs[key]}>
              <button
                onClick={() => togglePanel(key)}
                className={`w-full ${color} p-4 md:p-6 rounded shadow text-black font-bold text-xl flex justify-between items-center`}
              >
                <span>{label}</span>
                <span
                  className={`ml-2 transform transition-transform duration-300 ${
                    isOpen ? "rotate-180" : ""
                  }`}
                >
                  ▼
                </span>
              </button>

              <div
                ref={ref}
                style={style}
                className="overflow-hidden mt-2 bg-gray-800 rounded shadow"
              >
                <div className="p-4 md:p-6">{component}</div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
