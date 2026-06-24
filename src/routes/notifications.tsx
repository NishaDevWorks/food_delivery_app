import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/notifications")({
  head: () => ({ meta: [{ title: "Notifications – QuickBite" }] }),
  component: NotificationsPage,
});

const KEY = "quickbite_notif_prefs";
const defaults = {
  orderUpdates: true,
  promotions: true,
  deliveryAlerts: true,
  newsletter: false,
};

type Prefs = typeof defaults;

function NotificationsPage() {
  const [prefs, setPrefs] = useState<Prefs>(defaults);

  useEffect(() => {
    try { setPrefs({ ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }); } catch {}
  }, []);

  const toggle = (k: keyof Prefs) => {
    const next = { ...prefs, [k]: !prefs[k] };
    setPrefs(next);
    localStorage.setItem(KEY, JSON.stringify(next));
  };

  const rows: { k: keyof Prefs; label: string; desc: string }[] = [
    { k: "orderUpdates", label: "Order updates", desc: "Confirmation, prep, dispatch" },
    { k: "deliveryAlerts", label: "Delivery alerts", desc: "Rider near you & arrival" },
    { k: "promotions", label: "Promotions", desc: "Offers, coupons & deals" },
    { k: "newsletter", label: "Newsletter", desc: "Weekly food picks" },
  ];

  return (
    <MobileShell>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-xl font-black text-slate-900">Notifications</h1>
        </div>

        <div className="mt-5 bg-white/90 rounded-3xl shadow-sm divide-y divide-slate-100">
          {rows.map((r) => (
            <div key={r.k} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
              <button
                onClick={() => toggle(r.k)}
                className={`w-12 h-7 rounded-full transition relative ${prefs[r.k] ? "bg-gradient-to-r from-violet-500 to-pink-500" : "bg-slate-200"}`}
              >
                <span className={`absolute top-0.5 ${prefs[r.k] ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </MobileShell>
  );
}
