// pages/index.tsx
import { GetServerSideProps } from 'next'

export default function Home() {
  return null // rien à afficher, la redirection se fait côté serveur
}

export const getServerSideProps: GetServerSideProps = async () => {
  return {
    redirect: {
      destination: '/auth',
      permanent: false, // non permanent, pour pouvoir changer la destination plus tard
    },
  }
}
