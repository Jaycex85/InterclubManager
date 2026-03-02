export default function ClubsDashboard() {
  const [clubs, setClubs] = useState<Club[]>([]);
  
  useEffect(() => {
    const fetchClubs = async () => {
      const { data, error } = await supabase.from("clubs").select("*");
      if (!error) setClubs(data);
    }
    fetchClubs();
  }, []);

  return (
    <Layout>
      <h1>Clubs</h1>
      <Table columns={["Nom", "Adresse", "Actions"]} data={clubs} />
    </Layout>
  );
}
