// pages/_app.tsx
import '../styles/globals.css'
import type { AppProps } from 'next/app'
import { supabase } from '../utils/supabaseClient'

export default function App({ Component, pageProps }: AppProps) {
  return <Component {...pageProps} supabase={supabase} />
}
