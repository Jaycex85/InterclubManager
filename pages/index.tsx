import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async () => ({
  redirect: { destination: '/auth', permanent: false }
})

export default function Home() {
  return null
}
