// pages/index.tsx
import { GetServerSideProps } from 'next'

export default function Home() {
  return null
}

export const getServerSideProps: GetServerSideProps = async (ctx) => {
  return {
    redirect: {
      destination: '/auth',
      permanent: false,
    },
  }
}
