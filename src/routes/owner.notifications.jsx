import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { OwnerShell } from "@/components/OwnerShell";
import { fetchNotifications, markAllRead, markRead, deleteNotification } from "@/lib/notifications-api";
import { supabase } from "@/integrations/supabase/client";
import { Bell, Trash2, Package, XCircle, Info, Star, Check } from "lucide-react";
export const Route = createFileRoute("/owner/notifications")({
    head: () => ({ meta: [{ title: "Notifications – Owner" }] }),
    component: () => (<OwnerShell><OwnerNotifs /></OwnerShell>),
});
function OwnerNotifs() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();
    async function load() {
        setLoading(true);
        setItems(await fetchNotifications());
        setLoading(false);
    }
    useEffect(() => {
        load();
        let channel;
        (async () => {
            const { data } = await supabase.auth.getUser();
            if (!data.user)
                return;
            channel = supabase
                .channel(`owner-notif-${data.user.id}`)
                .on("postgres_changes", { event: "*", schema: "public", table: "notifications", filter: `user_id=eq.${data.user.id}` }, () => load())
                .subscribe();
        })();
        return () => { if (channel)
            supabase.removeChannel(channel); };
    }, []);
    const unread = items.filter((i) => !i.read).length;
    async function openItem(n) {
        if (!n.read) {
            await markRead(n.id);
            setItems((cur) => cur.map((x) => x.id === n.id ? { ...x, read: true } : x));
        }
        if (n.link)
            navigate({ to: n.link });
    }
    return (<div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900">Notifications</h2>
          <p className="text-xs text-slate-500">{unread} unread</p>
        </div>
        {unread > 0 && (<button onClick={async () => { await markAllRead(); load(); }} className="text-xs font-semibold text-violet-600 px-3 h-9 rounded-xl bg-violet-50">
            Mark all read
          </button>)}
      </div>

      {loading ? (<div className="py-10 text-center text-sm text-slate-400">Loading…</div>) : items.length === 0 ? (<div className="py-16 flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
            <Bell className="w-7 h-7 text-slate-400"/>
          </div>
          <p className="mt-3 text-sm text-slate-500">No notifications yet.</p>
        </div>) : (<div className="space-y-2">
          {items.map((n) => (<div key={n.id} onClick={() => openItem(n)} className={`bg-white rounded-2xl p-3 shadow-sm flex items-start gap-3 cursor-pointer ${!n.read ? "border-l-4 border-violet-500" : ""}`}>
              <IconFor type={n.type}/>
              <div className="flex-1 min-w-0">
                <p className={`text-sm ${!n.read ? "font-bold text-slate-900" : "font-semibold text-slate-700"}`}>{n.title}</p>
                {n.body && <p className="text-xs text-slate-500">{n.body}</p>}
                <p className="text-[10px] text-slate-400 mt-0.5">{new Date(n.created_at).toLocaleString()}</p>
              </div>
              <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id).then(load); }} className="text-slate-300 hover:text-rose-500 shrink-0">
                <Trash2 className="w-4 h-4"/>
              </button>
            </div>))}
        </div>)}
    </div>);
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
