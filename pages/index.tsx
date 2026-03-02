// pages/index.tsx
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/auth') // redirige vers page login/signup
  }, [router])

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-gray-100">
      <p>Redirection...</p>
    </div>
  )
}
