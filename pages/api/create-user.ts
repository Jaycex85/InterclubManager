import type { NextApiRequest, NextApiResponse } from 'next'
import { supabase } from '../../utils/supabaseClient'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()
  const { email, password, club_id, role } = req.body

  // Vérifie si le user connecté est club_admin
  const { data: session } = await supabase.auth.getSession()
  const userId = session?.session?.user?.id
  const { data: membership } = await supabase
    .from('club_memberships')
    .select('role')
    .eq('user_id', userId)
    .eq('club_id', club_id)
    .single()

  if (!membership || membership.role !== 'club_admin') return res.status(403).json({ error: 'Forbidden' })

  const { data, error } = await supabase.auth.admin.createUser({ email, password })
  if (error) return res.status(400).json({ error: error.message })

  await supabase.from('club_memberships').insert({
    user_id: data.user?.id,
    club_id,
    role
  })

  res.status(200).json({ user: data.user })
}
