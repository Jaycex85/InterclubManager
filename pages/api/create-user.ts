// pages/api/create-user.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY! // cle service role
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).end()

  const { email, password, role, club_id } = req.body

  if (!email || !password || !role || !club_id) {
    return res.status(400).json({ error: 'Tous les champs sont obligatoires' })
  }

  try {
    // Créer l'utilisateur
    const { data: userData, error: userError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true
    })
    if (userError) throw userError

    // Ajouter membership
    const { error: membershipError } = await supabaseAdmin
      .from('club_memberships')
      .insert([{ user_id: userData.id, club_id, role, joined_at: new Date().toISOString() }])
    if (membershipError) throw membershipError

    return res.status(200).json({ message: 'Utilisateur créé avec succès !' })
  } catch (err: any) {
    return res.status(500).json({ error: err.message })
  }
}
