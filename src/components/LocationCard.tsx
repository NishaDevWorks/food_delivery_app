import { MapPin, LocateFixed, Loader2, AlertTriangle } from "lucide-react";
import { useCurrentLocationLabel } from "@/lib/location";

/** Detect + show the user's real current address. Permission is asked only on tap. */
export function LocationCard({
  loc,
  className = "",
}: {
  loc: ReturnType<typeof useCurrentLocationLabel>;
  className?: string;
}) {
  const { status, address, label, coords, error, loading, turnOn } = loc;
  const failed = status === "denied" || status === "unavailable" || status === "error";

  return (
    <div className={`bg-white/90 rounded-2xl p-4 shadow-sm ${className}`}>
      <div className="flex items-start gap-3">
        <div
          className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
            failed ? "bg-amber-100 text-amber-600" : "bg-violet-100 text-violet-600"
          }`}
        >
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : failed ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <MapPin className="w-4 h-4" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            Current location
          </p>

          {loading && !address ? (
            <p className="text-sm font-bold text-slate-800">Detecting your location…</p>
          ) : status === "ready" && (address || label) ? (
            <>
              <p className="text-sm font-bold text-slate-800 break-words">{address || label}</p>
              {coords && (
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {coords.lat.toFixed(5)}, {coords.lng.toFixed(5)}
                </p>
              )}
            </>
          ) : failed ? (
            <p className="text-sm font-bold text-slate-800">{error}</p>
          ) : (
            <p className="text-sm font-bold text-slate-800">
              Turn on location to detect your address
            </p>
          )}

          <button
            onClick={turnOn}
            disabled={loading}
            className="mt-2 inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[12px] font-bold shadow disabled:opacity-60"
          >
            <LocateFixed className="w-3.5 h-3.5" />
            {loading
              ? "Detecting…"
              : status === "ready"
                ? "Update location"
                : failed
                  ? "Try again"
                  : "Turn On Location"}
          </button>
        </div>
      </div>
    </div>
  );
}
