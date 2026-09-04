import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Bell, Check, Trash2, Package, XCircle, Info, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { fetchNotifications, markAllRead, markRead, deleteNotification } from "@/lib/notifications-api";
import { supabase } from "@/integrations/supabase/client";
export const Route = createFileRoute("/notifications")({
    head: () => ({ meta: [{ title: "Notifications – QuickBite" }] }),
    component: NotificationsPage,
});
const KEY = "quickbite_notif_prefs";
const defaults = { orderUpdates: true, promotions: true, deliveryAlerts: true, newsletter: false };
function NotificationsPage() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [prefs, setPrefs] = useState(defaults);
    const navigate = useNavigate();
    async function load() {
        setLoading(true);
        setItems(await fetchNotifications());
        setLoading(false);
    }
    useEffect(() => {
        load();
        try {
            setPrefs({ ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") });
        }
        catch { }
        let channel;
        (async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user)
                return;
            channel = supabase
                .channel(`notif-${data.user.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` }, () => load())
                .subscribe();
        })();
        return () => { if (channel)
            supabase.removeChannel(channel); };
    }, []);
    const toggle = (k) => {
        const next = { ...prefs, [k]: !prefs[k] };
        setPrefs(next);
        localStorage.setItem(KEY, JSON.stringify(next));
    };
    const unread = items.filter((i) => !i.read).length;
    async function openItem(n) {
        if (!n.read) {
            await markRead(n.id);
            setItems((cur) => cur.map((x) => x.id === n.id ? { ...x, read: true } : x));
        }
        if (n.link)
            navigate({ to: n.link });
    }
    const prefRows = [
        { k: "orderUpdates", label: "Order updates", desc: "Confirmation, prep, dispatch" },
        { k: "deliveryAlerts", label: "Delivery alerts", desc: "Rider near you & arrival" },
        { k: "promotions", label: "Promotions", desc: "Offers, coupons & deals" },
        { k: "newsletter", label: "Newsletter", desc: "Weekly food picks" },
    ];
    return (<MobileShell>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700"/>
          </Link>
          <h1 className="text-xl font-black text-slate-900 flex-1">Notifications</h1>
          {unread > 0 && (<button onClick={async () => { await markAllRead(); load(); }} className="text-xs font-semibold text-violet-600">
              Mark all read
            </button>)}
        </div>

        <div className="mt-4">
          {loading ? (<div className="py-10 text-center text-sm text-slate-400">Loading…</div>) : items.length === 0 ? (<div className="py-10 flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                <Bell className="w-7 h-7 text-slate-400"/>
              </div>
              <p className="mt-3 text-sm text-slate-500">You're all caught up.</p>
            </div>) : (<div className="space-y-2">
              {items.map((n) => (<div key={n.id} onClick={() => openItem(n)} className={`bg-white/90 rounded-2xl p-3 shadow-sm flex items-start gap-3 cursor-pointer ${!n.read ? "border-l-4 border-violet-500" : ""}`}>
                  <IconFor type={n.type}/>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm ${!n.read ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{n.title}</p>
                    {n.body && <p className="text-xs text-slate-500 line-clamp-2">{n.body}</p>}
                    <p className="text-[10px] text-slate-400 mt-1">{timeAgo(n.created_at)}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id).then(load); }} className="text-slate-300 hover:text-rose-500 shrink-0" aria-label="Delete">
                    <Trash2 className="w-4 h-4"/>
                  </button>
                </div>))}
            </div>)}
        </div>

        <h2 className="mt-8 text-sm font-bold text-slate-800 px-1">Preferences</h2>
        <div className="mt-2 bg-white/90 rounded-3xl shadow-sm divide-y divide-slate-100">
          {prefRows.map((r) => (<div key={r.k} className="flex items-center gap-3 p-4">
              <div className="flex-1">
                <p className="text-sm font-semibold text-slate-800">{r.label}</p>
                <p className="text-xs text-slate-500">{r.desc}</p>
              </div>
              <button onClick={() => toggle(r.k)} className={`w-12 h-7 rounded-full transition relative ${prefs[r.k] ? "bg-gradient-to-r from-violet-500 to-pink-500" : "bg-slate-200"}`} aria-label={`Toggle ${r.label}`}>
                <span className={`absolute top-0.5 ${prefs[r.k] ? "left-6" : "left-0.5"} w-6 h-6 bg-white rounded-full shadow transition-all`}/>
              </button>
            </div>))}
        </div>
      </div>
    </MobileShell>);
}
function IconFor({ type }) {
    const map = {
        new_order: { c: "bg-violet-100 text-violet-600", Icon: Package },
        delivered: { c: "bg-emerald-100 text-emerald-600", Icon: Check },
        cancelled: { c: "bg-rose-100 text-rose-600", Icon: XCircle },
        review: { c: "bg-amber-100 text-amber-600", Icon: Star },
        system: { c: "bg-sky-100 text-sky-600", Icon: Info },
    };
    const m = map[type] ?? map.system;
    return (<div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${m.c}`}>
      <m.Icon className="w-4 h-4"/>
    </div>);
}
function timeAgo(iso) {
    const diff = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
    if (diff < 1)
        return "just now";
    if (diff < 60)
        return `${diff}m ago`;
    const h = Math.floor(diff / 60);
    if (h < 24)
        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
