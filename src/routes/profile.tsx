import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, MapPin, CreditCard, Bell, HelpCircle, LogOut, Store, Package, Heart } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile – QuickBite" }],
  }),
  component: ProfilePage,
});

const items = [
  { icon: Package, label: "Order history", to: "/orders" as const },
  { icon: Heart, label: "Favorites", to: "/favorites" as const },
  { icon: MapPin, label: "Saved addresses", to: "/addresses" as const },
  { icon: CreditCard, label: "Payment methods", to: "/payments" as const },
  { icon: Bell, label: "Notifications", to: "/notifications" as const },
  
  { icon: HelpCircle, label: "Help & support", to: "/help" as const },
];

function ProfilePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<{ name: string; email: string; avatar: string | null }>({
    name: "Guest",
    email: "",
    avatar: null,
  });

  useEffect(() => {
    (async () => {
      const { data: userData } = await supabase.auth.getUser();
      const user = userData.user;
      if (!user) return;
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      let name = meta.full_name || meta.name || (user.email ? user.email.split("@")[0] : "Guest");
      let avatar = meta.avatar_url || meta.picture || null;
      // Prefer profile row (canonical)
      const { data: prof } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (prof) {
        if (prof.display_name) name = prof.display_name;
        if (prof.avatar_url) avatar = prof.avatar_url;
      }
      setProfile({ name, email: user.email ?? "", avatar });
    })();
  }, []);

  async function signOut() {
    await supabase.auth.signOut();
    try { localStorage.removeItem("quickbite_user"); } catch {}
    navigate({ to: "/" });
  }

  const initial = (profile.name || "?").trim().charAt(0).toUpperCase();

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <h1 className="text-xl font-black text-slate-900">Profile</h1>

        <div className="mt-5 bg-white/90 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt={profile.name}
              className="w-16 h-16 rounded-2xl object-cover shadow"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold">
              {initial}
            </div>
          )}
          <div className="min-w-0">
            <p className="font-bold text-slate-900 truncate">{profile.name}</p>
            <p className="text-xs text-slate-500 truncate">{profile.email || "—"}</p>
          </div>
        </div>

        <div className="mt-5 bg-white/90 rounded-3xl shadow-sm divide-y divide-slate-100 overflow-hidden">
          {items.map(({ icon: Icon, label, to }) => (
            <Link
              key={label}
              to={to}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}
        </div>

        <button
          onClick={signOut}
          className="mt-5 w-full h-12 rounded-2xl bg-white border border-rose-200 text-rose-600 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        <p className="mt-6 text-center text-[11px] text-slate-400">QuickBite v1.0</p>
      </div>
    </MobileShell>
  );
}
