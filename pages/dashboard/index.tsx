useEffect(() => {
  if (!user) return;
  if (user.role === "admin") router.push("/dashboard/admin/clubs");
  else if (user.role === "responsable") router.push("/dashboard/responsable/equipes");
}, [user]);
