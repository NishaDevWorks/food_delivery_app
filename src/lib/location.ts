import { useCallback, useEffect, useRef, useState } from "react";

const COORDS_KEY = "quickbite_location";
const LABEL_KEY = "quickbite_location_label";
const ADDRESS_KEY = "quickbite_location_address";

export type Coords = { lat: number; lng: number };

export function readCoords(): Coords | null {
  try {
    const raw = localStorage.getItem(COORDS_KEY);
    if (!raw) return null;
    const c = JSON.parse(raw);
    if (typeof c?.lat === "number" && typeof c?.lng === "number") return c;
    return null;
  } catch { return null; }
}

export function readLabel(): string {
  try { return localStorage.getItem(LABEL_KEY) || ""; } catch { return ""; }
}

export function readAddress(): string {
  try { return localStorage.getItem(ADDRESS_KEY) || ""; } catch { return ""; }
}

type Geo = { short: string; full: string };

async function reverseGeocode(c: Coords): Promise<Geo | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=18&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const a = data?.address ?? {};

    const street = [a.house_number, a.road].filter(Boolean).join(" ");
    const area = a.neighbourhood || a.suburb || a.quarter || a.hamlet || a.village || a.city_district;
    const city = a.city || a.town || a.municipality || a.county || a.state_district;
    const state = a.state;
    const pin = a.postcode;

    const fullParts = [street || a.amenity || null, area, city, state, pin].filter(Boolean);
    const full = fullParts.length ? Array.from(new Set(fullParts)).join(", ") : (data?.display_name ?? "");
    const shortParts = [street || area, city && city !== (street || area) ? city : null].filter(Boolean);
    const short = shortParts.join(" · ") || full.split(",").slice(0, 2).join(" · ");

    if (!short && !full) return null;
    return { short: short || full, full: full || short };
  } catch { return null; }
}

/** Live "deliver to" info based on the device's current GPS position. */
export function useCurrentLocationLabel() {
  const [label, setLabel] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const cancelled = useRef(false);

  const resolve = useCallback(async (c: Coords) => {
    setCoords(c);
    try { localStorage.setItem(COORDS_KEY, JSON.stringify(c)); } catch {}
    const g = await reverseGeocode(c);
    if (cancelled.current) return;
    const short = g?.short ?? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`;
    const full = g?.full ?? short;
    setLabel(short);
    setAddress(full);
    try {
      localStorage.setItem(LABEL_KEY, short);
      localStorage.setItem(ADDRESS_KEY, full);
    } catch {}
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setError("Location unavailable on this device");
      setLabel((l) => l || "Location unavailable");
      return;
    }
    setLoading(true);
    setError("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        void resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude });
      },
      (err) => {
        setLoading(false);
        setError(
          err.code === err.PERMISSION_DENIED
            ? "Location permission denied"
            : "Couldn't get your location"
        );
        setLabel((l) => l || "Location off");
      },
      // Always force a fresh, precise fix so the address matches where the user is now.
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  }, [resolve]);

  useEffect(() => {
    cancelled.current = false;

    const cachedLabel = readLabel();
    if (cachedLabel) setLabel(cachedLabel);
    const cachedAddress = readAddress();
    if (cachedAddress) setAddress(cachedAddress);
    const cached = readCoords();
    if (cached) setCoords(cached);

    locate();
    return () => { cancelled.current = true; };
  }, [locate]);

  return {
    label: label || "Locating…",
    address,
    coords,
    loading,
    error,
    refresh: locate,
  };
}
