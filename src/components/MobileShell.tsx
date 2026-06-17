import { Link, useRouterState } from "@tanstack/react-router";
import { Home, ShoppingBag, MapPin, User, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { useCart } from "@/lib/cart";

export function MobileShell({
  children,
  hideNav = false,
}: {
  children: ReactNode;
  hideNav?: boolean;
}) {
  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-violet-100 via-pink-50 to-sky-100 flex items-center justify-center p-0 sm:p-6">
      <div className="relative w-full sm:max-w-[420px] sm:rounded-[36px] sm:shadow-2xl bg-white/80 backdrop-blur-xl min-h-screen sm:min-h-[760px] sm:max-h-[860px] overflow-hidden flex flex-col">
        <div className="flex-1 overflow-y-auto pb-24">{children}</div>
        {!hideNav && <BottomNav />}
      </div>
    </div>
  );
}

function NavItem({
  to,
  icon: Icon,
  label,
  active,
  badge,
}: {
  to: string;
  icon: LucideIcon;
  label: string;
  active: boolean;
  badge?: number;
}) {
  return (
    <Link
      to={to}
      className="relative flex flex-col items-center justify-center gap-1 flex-1 py-2"
    >
      <div
        className={`relative p-2 rounded-2xl transition-all ${
          active
            ? "bg-gradient-to-br from-violet-400 to-pink-400 text-white shadow-lg shadow-pink-200"
            : "text-slate-400"
        }`}
      >
        <Icon className="w-5 h-5" />
        {badge ? (
          <span className="absolute -top-1 -right-1 bg-rose-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center">
            {badge}
          </span>
        ) : null}
      </div>
      <span className={`text-[10px] font-medium ${active ? "text-slate-800" : "text-slate-400"}`}>
        {label}
      </span>
    </Link>
  );
}

function BottomNav() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { count } = useCart();
  return (
    <nav className="absolute bottom-0 left-0 right-0 bg-white/90 backdrop-blur-xl border-t border-slate-200/60 flex px-2 pb-[env(safe-area-inset-bottom)]">
      <NavItem to="/home" icon={Home} label="Home" active={path === "/home"} />
      <NavItem to="/cart" icon={ShoppingBag} label="Cart" active={path === "/cart"} badge={count || undefined} />
      <NavItem to="/track" icon={MapPin} label="Track" active={path === "/track"} />
      <NavItem to="/profile" icon={User} label="Profile" active={path === "/profile"} />
    </nav>
  );
}
