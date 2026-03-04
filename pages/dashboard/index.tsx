// pages/dashboard/index.tsx
'use client'

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
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) {
          router.replace("/auth");
          return;
        }

        // Récupère le profil
        const { data: userProfile, error } = await supabase
          .from("users")
          .select("*")
          .eq("auth_id", session.user.id)
          .single();

        if (error || !userProfile) {
          router.replace("/auth");
          return;
        }

        // Redirection selon rôle
        switch (userProfile.role) {
          case "admin":
            router.replace("/dashboard/admin/AdminDashboard");
            break;
          case "club_admin":
            router.replace("/dashboard/club_admin/equipes");
            break;
          case "player":
            router.replace("/dashboard/player/home");
            break;
          default:
            router.replace("/auth");
        }
      } catch (err) {
        console.error("Erreur dashboard:", err);
        router.replace("/auth");
      } finally {
        setLoading(false);
      }
    };

    checkUser();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
      {loading && <p>Vérification de votre session...</p>}
    </div>
  );
}
