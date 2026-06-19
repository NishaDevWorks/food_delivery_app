import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ChevronRight, MapPin, CreditCard, Bell, HelpCircle, LogOut } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";

export const Route = createFileRoute("/profile")({
  head: () => ({
    meta: [{ title: "Profile – QuickBite" }],
  }),
  component: ProfilePage,
});

const items = [
  { icon: MapPin, label: "Saved addresses", to: "/profile" },
  { icon: CreditCard, label: "Payment methods", to: "/profile" },
  { icon: Bell, label: "Notifications", to: "/profile" },
  { icon: HelpCircle, label: "Help & support", to: "/profile" },
];

function ProfilePage() {
  const navigate = useNavigate();
  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <h1 className="text-xl font-black text-slate-900">Profile</h1>

        <div className="mt-5 bg-white/90 rounded-3xl p-5 shadow-sm flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white text-2xl font-bold">
            R
          </div>
          <div>
            <p className="font-bold text-slate-900">Riya Patel</p>
            <p className="text-xs text-slate-500">riya@quickbite.app</p>
          </div>
        </div>

        <div className="mt-5 bg-white/90 rounded-3xl shadow-sm divide-y divide-slate-100">
          {items.map(({ icon: Icon, label }) => (
            <button
              key={label}
              className="w-full flex items-center gap-3 p-4 text-left"
            >
              <div className="w-9 h-9 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <Icon className="w-4 h-4" />
              </div>
              <span className="flex-1 text-sm font-medium text-slate-800">{label}</span>
              <ChevronRight className="w-4 h-4 text-slate-400" />
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            try { localStorage.removeItem("quickbite_user"); } catch {}
            navigate({ to: "/" });
          }}
          className="mt-5 w-full h-12 rounded-2xl bg-white border border-rose-200 text-rose-600 font-semibold flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" /> Sign out
        </button>

        <p className="mt-6 text-center text-[11px] text-slate-400">QuickBite v1.0</p>
        <Link to="/home" className="hidden" />
      </div>
    </MobileShell>
  );
}
