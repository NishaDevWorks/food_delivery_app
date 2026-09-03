import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import { LayoutDashboard, ClipboardList, UtensilsCrossed, Settings, BarChart3, ArrowLeft, Store, ChevronDown, MessageSquare, Tag, Bell } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { fetchMyRestaurants, isOwner, type OwnedRestaurant } from "@/lib/owner-api";
import { supabase } from "@/integrations/supabase/client";

const OWNER_KEY = "quickbite_owner_active";

export function useActiveRestaurant() {
  const [rid, setRidState] = useState<string | null>(null);
  useEffect(() => {
    try { setRidState(localStorage.getItem(OWNER_KEY)); } catch {}
  }, []);
  const setRid = (id: string) => {
    localStorage.setItem(OWNER_KEY, id);
    setRidState(id);
    window.dispatchEvent(new Event("quickbite:owner-changed"));
  };
  useEffect(() => {
    const h = () => {
      try { setRidState(localStorage.getItem(OWNER_KEY)); } catch {}
    };
    window.addEventListener("quickbite:owner-changed", h);
    return () => window.removeEventListener("quickbite:owner-changed", h);
  }, []);
  return [rid, setRid] as const;
}

export function OwnerShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const path = useRouterState({ select: (s) => s.location.pathname });
  const [loading, setLoading] = useState(true);
  const [owner, setOwner] = useState(false);
  const [mine, setMine] = useState<OwnedRestaurant[]>([]);
  const [rid, setRid] = useActiveRestaurant();
  const [switchOpen, setSwitchOpen] = useState(false);

  async function refresh() {
    setLoading(true);
    const [ok, list] = await Promise.all([isOwner(), fetchMyRestaurants()]);
    setOwner(ok);
    setMine(list);
    if (list.length && (!rid || !list.find((r) => r.id === rid))) {
      setRid(list[0].id);
    }
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) { navigate({ to: "/" }); return; }
      refresh();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-violet-100 via-pink-50 to-sky-100">
        <div className="w-8 h-8 border-2 border-violet-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // No owner role or no restaurants → access request state
  if (!owner || mine.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-violet-100 via-pink-50 to-sky-100 p-6">
        <div className="max-w-2xl mx-auto">
          <Link to="/profile" className="inline-flex items-center gap-2 text-sm text-slate-600 mb-4">
            <ArrowLeft className="w-4 h-4" /> Back
          </Link>
          <div className="bg-white rounded-3xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500 to-pink-500 flex items-center justify-center">
                <Store className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-black text-slate-900">Restaurant Owner Portal</h1>
                <p className="text-xs text-slate-500">Manage your restaurant, menu, orders and earnings</p>
              </div>
            </div>
             <p className="mt-4 text-sm text-slate-600">
               Owner access has not been assigned to this account yet. Ask an administrator to connect your restaurant before opening the dashboard.
             </p>
             <Link to="/home" className="mt-5 inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 px-4 text-xs font-bold text-white">
               Back to QuickBite
             </Link>
          </div>
        </div>
      </div>
    );
  }

  const active = mine.find((r) => r.id === rid) ?? mine[0];
  const tabs = [
    { to: "/owner", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/owner/orders", label: "Orders", icon: ClipboardList },
    { to: "/owner/menu", label: "Menu", icon: UtensilsCrossed },
    { to: "/owner/reviews", label: "Reviews", icon: MessageSquare },
    { to: "/owner/coupons", label: "Coupons", icon: Tag },
    { to: "/owner/notifications", label: "Alerts", icon: Bell },
    { to: "/owner/analytics", label: "Analytics", icon: BarChart3 },
    { to: "/owner/settings", label: "Settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-violet-50">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/home" className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <ArrowLeft className="w-4 h-4 text-slate-700" />
          </Link>
          <div className="flex-1 min-w-0 relative">
            <button
              onClick={() => setSwitchOpen((v) => !v)}
              className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-slate-100 max-w-full"
            >
              <img src={active.image} alt="" className="w-8 h-8 rounded-lg object-cover" />
              <div className="text-left min-w-0">
                <p className="text-[10px] font-semibold text-violet-600 uppercase tracking-wider">Owner</p>
                <p className="text-sm font-black text-slate-900 truncate">{active.name}</p>
              </div>
              {mine.length > 1 && <ChevronDown className="w-4 h-4 text-slate-400" />}
            </button>
            {switchOpen && mine.length > 1 && (
              <div className="absolute top-full mt-1 left-0 bg-white rounded-2xl shadow-xl border border-slate-200 p-1 w-64 z-50">
                {mine.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => { setRid(r.id); setSwitchOpen(false); }}
                    className={`w-full flex items-center gap-2 p-2 rounded-xl text-left ${r.id === active.id ? "bg-violet-50" : "hover:bg-slate-50"}`}
                  >
                    <img src={r.image} className="w-8 h-8 rounded-lg object-cover" alt="" />
                    <span className="text-sm font-semibold truncate">{r.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        <nav className="max-w-6xl mx-auto px-2 flex gap-1 overflow-x-auto no-scrollbar">
          {tabs.map((t) => {
            const active = t.exact ? path === t.to : path.startsWith(t.to);
            return (
              <Link
                key={t.to}
                to={t.to}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold border-b-2 whitespace-nowrap ${
                  active ? "border-violet-500 text-violet-600" : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <t.icon className="w-3.5 h-3.5" />
                {t.label}
              </Link>
            );
          })}
        </nav>
      </header>

      <main className="max-w-6xl mx-auto p-4">
        {children}
      </main>
    </div>
  );
}
