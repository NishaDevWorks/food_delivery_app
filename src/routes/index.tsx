import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UtensilsCrossed, MapPin } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickBite – Sign in" },
      { name: "description", content: "Sign in to QuickBite to order food from nearby restaurants." },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    ],
  }),
  component: LoginPage,
});

const LOC_KEY = "quickbite_location_asked";

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [locStatus, setLocStatus] = useState<"idle" | "granted" | "denied">("idle");

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    if (localStorage.getItem(LOC_KEY)) return;
    const t = setTimeout(() => requestLocation(), 400);
    return () => clearTimeout(t);
  }, []);

  function requestLocation() {
    if (!("geolocation" in navigator)) {
      toast.error("Location not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(LOC_KEY, "1");
          localStorage.setItem(
            "quickbite_location",
            JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          );
        } catch {}
        setLocStatus("granted");
        toast.success("Location enabled — finding spots near you");
      },
      () => {
        try { localStorage.setItem(LOC_KEY, "1"); } catch {}
        setLocStatus("denied");
        toast.error("Location denied — using default area");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  function continueWithGoogle() {
    setLoading(true);
    setTimeout(() => navigate({ to: "/home" }), 900);
  }


  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-violet-200 via-pink-100 to-sky-200 flex items-center justify-center p-0 sm:p-6">
      <div className="relative w-full sm:max-w-[420px] sm:rounded-[36px] sm:shadow-2xl bg-white/70 backdrop-blur-2xl min-h-screen sm:min-h-[760px] overflow-hidden flex flex-col items-center justify-between p-8 pt-20">
        <div className="flex flex-col items-center text-center">
          <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center shadow-xl shadow-pink-200 mb-6">
            <UtensilsCrossed className="w-12 h-12 text-white" />
          </div>
          <h1 className="text-4xl font-black bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            QuickBite
          </h1>
          <p className="mt-3 text-slate-600 text-sm max-w-xs">
            Delicious food from your favorite spots — delivered to your door in minutes.
          </p>
        </div>

        <div className="w-full space-y-3">
          <button
            onClick={requestLocation}
            className={`w-full h-12 rounded-2xl font-semibold flex items-center justify-center gap-2 transition ${
              locStatus === "granted"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white/80 text-slate-700 border border-slate-200"
            }`}
          >
            <MapPin className="w-4 h-4" />
            {locStatus === "granted"
              ? "Location enabled"
              : locStatus === "denied"
              ? "Enable location"
              : "Use my location"}
          </button>
          <button
            onClick={continueWithGoogle}
            disabled={loading}
            className="w-full h-14 rounded-2xl bg-white text-slate-800 font-semibold shadow-lg shadow-slate-200/50 border border-slate-200 flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-[0.98] transition disabled:opacity-60"
          >
            <GoogleIcon />
            {loading ? "Signing in..." : "Continue with Google"}
          </button>
          <p className="text-center text-xs text-slate-500">
            By continuing you agree to our Terms & Privacy.
          </p>
        </div>

      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3c-1.6 4.7-6 8-11.3 8-6.6 0-12-5.4-12-12s5.4-12 12-12c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3 0 5.8 1.1 7.9 3l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.4 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.5-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.5 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.2 4.3-4 5.7l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}
