import { useState } from "react";
import { MapPin, LocateFixed, Loader2, AlertTriangle, Search, Pencil, Check } from "lucide-react";
import { useCurrentLocationLabel, type AddressSuggestion } from "@/lib/location";

/** Detect + show the user's real current address. Permission is asked only on tap. */
export function LocationCard({
  loc,
  className = "",
}: {
  loc: ReturnType<typeof useCurrentLocationLabel>;
  className?: string;
}) {
  const {
    status, parts, manual, setManual, lines, label, coords, accuracy, error, loading,
    turnOn, searchAddress, applySuggestion,
  } = loc;
  const failed = status === "denied" || status === "unavailable" || status === "error";
  const hasAddress = status === "ready" && lines.length > 0;

  const [editing, setEditing] = useState(false);
  const [searching, setSearching] = useState(false);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState(false);
  const [results, setResults] = useState<AddressSuggestion[]>([]);

  const runSearch = async () => {
    setBusy(true);
    try { setResults(await searchAddress(query)); } finally { setBusy(false); }
  };

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
            Deliver to
          </p>

          {loading && !hasAddress ? (
            <p className="text-sm font-bold text-slate-800">Detecting your location…</p>
          ) : hasAddress ? (
            <div className="space-y-0.5">
              {lines.map((line, i) => (
                <p
                  key={i}
                  className={
                    i === 0
                      ? "text-sm font-bold text-slate-800 break-words"
                      : "text-[12px] text-slate-600 break-words"
                  }
                >
                  {line}
                </p>
              ))}
              {!(parts.houseNumber || manual.houseNumber) && (
                <p className="text-[11px] text-amber-600 font-semibold pt-0.5">
                  Flat / house number not found — add it for accurate delivery
                </p>
              )}
              {coords && (
                <p className="text-[11px] text-slate-400 pt-0.5">
                  {coords.lat.toFixed(6)}, {coords.lng.toFixed(6)}
                  {accuracy ? ` · ±${Math.round(accuracy)} m` : ""}
                </p>
              )}
              {error && <p className="text-[11px] text-amber-600">{error}</p>}
            </div>
          ) : failed ? (
            <p className="text-sm font-bold text-slate-800">{error}</p>
          ) : (
            <p className="text-sm font-bold text-slate-800">
              {status === "ready" ? label : "Turn on location to detect your address"}
            </p>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <button
              onClick={turnOn}
              disabled={loading}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[12px] font-bold shadow disabled:opacity-60"
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

            <button
              onClick={() => { setEditing((v) => !v); setSearching(false); }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-[12px] font-bold"
            >
              <Pencil className="w-3.5 h-3.5" />
              Flat / building
            </button>

            <button
              onClick={() => { setSearching((v) => !v); setEditing(false); }}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-full bg-slate-100 text-slate-700 text-[12px] font-bold"
            >
              <Search className="w-3.5 h-3.5" />
              Enter manually
            </button>
          </div>

          {editing && (
            <div className="mt-3 grid grid-cols-2 gap-2">
              {([
                ["houseNumber", "Flat / House No."],
                ["building", "Building / Apartment"],
                ["society", "Society / Complex"],
                ["landmark", "Landmark (optional)"],
              ] as const).map(([key, ph]) => (
                <input
                  key={key}
                  value={manual[key]}
                  onChange={(e) => setManual({ [key]: e.target.value })}
                  placeholder={ph}
                  className="h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-[12px] text-slate-800 outline-none focus:border-violet-300"
                />
              ))}
              <button
                onClick={() => setEditing(false)}
                className="col-span-2 inline-flex items-center justify-center gap-1.5 h-9 rounded-xl bg-violet-500 text-white text-[12px] font-bold"
              >
                <Check className="w-3.5 h-3.5" /> Save details
              </button>
            </div>
          )}

          {searching && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") void runSearch(); }}
                  placeholder="Search area, street or pincode"
                  className="flex-1 h-9 px-3 rounded-xl bg-slate-50 border border-slate-200 text-[12px] text-slate-800 outline-none focus:border-violet-300"
                />
                <button
                  onClick={() => void runSearch()}
                  disabled={busy || query.trim().length < 3}
                  className="h-9 px-3 rounded-xl bg-slate-800 text-white text-[12px] font-bold disabled:opacity-50"
                >
                  {busy ? "…" : "Search"}
                </button>
              </div>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => { applySuggestion(r); setSearching(false); setResults([]); }}
                  className="w-full text-left text-[12px] text-slate-700 bg-slate-50 rounded-xl px-3 py-2 hover:bg-slate-100"
                >
                  {r.label}
                </button>
              ))}
              {!busy && query.trim().length >= 3 && results.length === 0 && (
                <p className="text-[11px] text-slate-400">No matches — try a nearby landmark or pincode.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
