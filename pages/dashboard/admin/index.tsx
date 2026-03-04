const AdminDashboard = dynamic(
  () => import('./admin/AdminDashboard'),
  { ssr: false }
)
