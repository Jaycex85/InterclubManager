// pages/dashboard/index.tsx
import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function DashboardRedirect() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkUser = async () => {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        console.log("Erreur récupération session :", sessionError);
        router.push("/auth");
        return;
      }

      if (!session?.user) {
        console.log("Pas de session user");
        router.push("/auth");
        return;
      }

      console.log("Session OK :", session.user);

      // Récupère le profil dans la table users
      const { data: userProfile, error: profileError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", session.user.id)
        .single();

      if (profileError || !userProfile) {
        console.log("Erreur profil ou profil introuvable :", profileError);
        router.push("/auth");
        return;
      }

      console.log("Profil trouvé :", userProfile);

      // Redirection selon rôle
      if (userProfile.role === "admin") {
        router.push("/dashboard/admin");
      } else if (userProfile.role === "club_admin") {
        router.push("/dashboard/responsable/equipes");
      } else if (userProfile.role === "player") {
        router.push("/dashboard/player/home");
      } else {
        console.log("Rôle inconnu :", userProfile.role);
        router.push("/auth");
      }
    };

    checkUser().finally(() => setLoading(false));
  }, [router]);

  return <p>{loading ? "Vérification de votre session..." : null}</p>;
}
