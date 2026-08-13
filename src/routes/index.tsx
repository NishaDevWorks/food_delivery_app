import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { UtensilsCrossed, MapPin, Mail, Lock, User as UserIcon, Phone } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "QuickBite – Sign in" },
      { name: "description", content: "Sign in to QuickBite with Google or email to order food from nearby restaurants." },
      { name: "viewport", content: "width=device-width, initial-scale=1.0" },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");

  // Indian mobile numbers: 10 digits starting 6-9, optional +91 / 0 prefix.
  const phoneDigits = phone.replace(/\D/g, "").replace(/^(91|0)(?=\d{10}$)/, "");
  const phoneError =
    !phone.trim()
      ? "Phone number is required"
      : !/^[6-9]\d{9}$/.test(phoneDigits)
        ? "Enter a valid 10-digit mobile number"
        : "";

  const [password, setPassword] = useState("");
  const [locStatus, setLocStatus] = useState<"idle" | "granted" | "denied">("idle");

  // If already signed in, jump to home.
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/home" });
    });
  }, [navigate]);

  useEffect(() => {
    if (typeof window === "undefined" || !("geolocation" in navigator)) return;
    const t = setTimeout(() => requestLocation(true), 500);
    return () => clearTimeout(t);
  }, []);

  function requestLocation(silent = false) {
    if (!("geolocation" in navigator)) {
      if (!silent) toast.error("Location not supported on this device");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        try {
          localStorage.setItem(
            "quickbite_location",
            JSON.stringify({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
          );
        } catch {}
        setLocStatus("granted");
        toast.success("Location enabled — finding spots near you");
      },
      () => {
        setLocStatus("denied");
        if (!silent) toast.error("Location denied — using default area");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }

  async function submitEmail() {
    if (!email || !password || (tab === "signup" && (!name || !phone))) {
      toast.error("Please fill all fields");
      return;
    }
    if (tab === "signup") {
      if (phoneError) {
        toast.error(phoneError);
        return;
      }
      if (password.length < 6) {
        toast.error("Password must be at least 6 characters");
        return;
      }
    }
    setLoading(true);
    try {
      if (tab === "signin") {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        cacheUser(data.session?.user);
        toast.success("Welcome back!");
        navigate({ to: "/home" });
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/home`,
            data: { full_name: name, phone },
          },
        });
        if (error) throw error;
        if (!data.session) {
          toast.success("Check your email to confirm your account");
          return;
        }
        cacheUser(data.session.user);
        toast.success("Account created!");
        navigate({ to: "/home" });
      }

    } catch (e: any) {
      toast.error(e?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  async function continueWithGoogle() {
    setLoading(true);
    try {
      const result = await lovable.auth.signInWithOAuth("google", {
        redirect_uri: window.location.origin,
      });
      if (result.error) {
        toast.error((result.error as any).message || "Google sign-in failed");
        setLoading(false);
        return;
      }
      if (result.redirected) return; // browser is redirecting
      const { data } = await supabase.auth.getSession();
      cacheUser(data.session?.user);
      navigate({ to: "/home" });
    } catch (e: any) {
      toast.error(e?.message || "Google sign-in failed");
      setLoading(false);
    }
  }

  function cacheUser(user: import("@supabase/supabase-js").User | undefined | null) {
    if (!user) return;
    try {
      const meta = (user.user_metadata ?? {}) as Record<string, string>;
      localStorage.setItem(
        "quickbite_user",
        JSON.stringify({
          id: user.id,
          name: meta.full_name || meta.name || user.email?.split("@")[0] || "User",
          email: user.email ?? "",
          avatar: meta.avatar_url || meta.picture || null,
        }),
      );
    } catch {}
  }

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-violet-200 via-pink-100 to-sky-200 flex items-center justify-center p-0 sm:p-6">
      <div className="relative w-full sm:max-w-[420px] sm:rounded-[36px] sm:shadow-2xl bg-white/70 backdrop-blur-2xl min-h-screen sm:min-h-[760px] overflow-hidden flex flex-col p-6 pt-12">
        <div className="flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center shadow-xl shadow-pink-200 mb-4">
            <UtensilsCrossed className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-black bg-gradient-to-r from-violet-600 to-pink-600 bg-clip-text text-transparent">
            QuickBite
          </h1>
          <p className="mt-2 text-slate-600 text-sm max-w-xs">
            Delicious food delivered in minutes.
          </p>
        </div>

        <div className="mt-6 bg-white/80 rounded-2xl p-1 flex">
          <button
            onClick={() => setTab("signin")}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition ${
              tab === "signin" ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow" : "text-slate-600"
            }`}
          >
            Sign in
          </button>
          <button
            onClick={() => setTab("signup")}
            className={`flex-1 h-10 rounded-xl text-sm font-semibold transition ${
              tab === "signup" ? "bg-gradient-to-r from-violet-500 to-pink-500 text-white shadow" : "text-slate-600"
            }`}
          >
            Sign up
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {tab === "signup" && (
            <>
              <Field icon={UserIcon} placeholder="Full name" value={name} onChange={setName} />
              <div>
                <Field
                  icon={Phone}
                  placeholder="Phone number (10 digits)"
                  type="tel"
                  value={phone}
                  onChange={(v) => setPhone(v.replace(/[^\d+\s-]/g, "").slice(0, 15))}
                />
                {phone.trim() && phoneError && (
                  <p className="mt-1 ml-1 text-[11px] font-medium text-rose-600">{phoneError}</p>
                )}
              </div>
            </>
          )}

          <Field icon={Mail} placeholder="Email" type="email" value={email} onChange={setEmail} />
          <Field icon={Lock} placeholder="Password" type="password" value={password} onChange={setPassword} />

          <button
            onClick={submitEmail}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold shadow-lg shadow-pink-200 active:scale-[0.98] transition disabled:opacity-60"
          >
            {loading ? "Please wait..." : tab === "signin" ? "Sign in" : "Create account"}
          </button>
        </div>

        <div className="my-4 flex items-center gap-3 text-xs text-slate-400">
          <div className="flex-1 h-px bg-slate-200" /> or <div className="flex-1 h-px bg-slate-200" />
        </div>

        <div className="space-y-3">
          <button
            onClick={continueWithGoogle}
            disabled={loading}
            className="w-full h-12 rounded-2xl bg-white text-slate-800 font-semibold shadow border border-slate-200 flex items-center justify-center gap-3 active:scale-[0.98] transition disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            onClick={() => requestLocation(false)}
            className={`w-full h-11 rounded-2xl font-medium text-sm flex items-center justify-center gap-2 transition ${
              locStatus === "granted"
                ? "bg-emerald-100 text-emerald-700"
                : "bg-white/80 text-slate-700 border border-slate-200"
            }`}
          >
            <MapPin className="w-4 h-4" />
            {locStatus === "granted" ? "Location enabled" : "Enable location"}
          </button>
        </div>

        <p className="mt-4 text-center text-[11px] text-slate-500">
          By continuing you agree to our Terms & Privacy.
        </p>
      </div>
    </div>
  );
}

function Field({
  icon: Icon,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  icon: typeof Mail;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="relative">
      <Icon className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full h-12 pl-11 pr-4 rounded-2xl bg-white/90 border border-slate-200 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-300"
      />
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
