useEffect(() => {
  if (!user) return;
  if (user.role === "super_admin") router.push("/dashboard/super-admin/clubs");
  else if (user.role === "responsable") router.push("/dashboard/responsable/equipes");
}, [user]);
