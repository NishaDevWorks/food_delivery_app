import { useCallback, useEffect, useRef, useState } from "react";

const COORDS_KEY = "quickbite_location";
const LABEL_KEY = "quickbite_location_label";
const ADDRESS_KEY = "quickbite_location_address";
const ENABLED_KEY = "quickbite_location_enabled";

export type Coords = { lat: number; lng: number };

export type LocationStatus =
  | "off" // user has not turned location on yet
  | "detecting"
  | "ready"
  | "denied"
  | "unavailable" // no geolocation support / services disabled
  | "error";

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

export function isLocationEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) === "1"; } catch { return false; }
}

type Geo = { short: string; full: string; hasStreet: boolean };

/** One reverse-geocode lookup at a given detail zoom. */
async function lookup(c: Coords, zoom: number): Promise<Geo | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=${zoom}&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const a = data?.address ?? {};

    const house = a.house_number || null;
    const building =
      a.house_name || a.building || a.apartments || a.residential ||
      (data?.type && ["building", "house", "apartments"].includes(data.type) ? data?.name : null) ||
      null;
    const road =
      a.road || a.pedestrian || a.footway || a.path || a.cycleway || a.street || null;
    const place = data?.name || a.amenity || a.shop || a.office || null;
    const neighbourhood = a.neighbourhood || a.hamlet || null;
    const locality = a.suburb || a.quarter || a.city_district || a.village || a.town_district || null;
    const city = a.city || a.town || a.village || a.municipality || null;
    const district = a.state_district || a.county || a.district || null;
    const state = a.state || a.region || null;
    const pin = a.postcode || null;
    const country = a.country || null;

    // "12, Sunrise Apartments, MG Road, Kalawad Area, Nehrunagar, Rajkot,
    //  Rajkot District, Gujarat 360001, India" — include only what exists.
    const parts: string[] = [];
    if (house) parts.push(house);
    if (building) parts.push(building);
    if (road) parts.push(road);
    else if (!building && place) parts.push(place);
    if (neighbourhood) parts.push(neighbourhood);
    if (locality && locality !== neighbourhood) parts.push(locality);
    if (city) parts.push(city);
    if (district && district !== city) parts.push(district);
    if (state || pin) parts.push([state, pin].filter(Boolean).join(" "));
    if (country) parts.push(country);

    const composed = Array.from(new Set(parts)).join(", ");
    const display: string = data?.display_name ?? "";
    // If we only resolved a couple of coarse fields (e.g. just city + country),
    // Nominatim's display_name usually carries far more detail — use it instead.
    const full = parts.length >= 3 ? composed : (display || composed);
    const streetLine = [house, road || building || place].filter(Boolean).join(", ");
    const area = neighbourhood || locality;
    const shortParts = [streetLine || area, city && city !== (streetLine || area) ? city : null].filter(Boolean);
    const short = shortParts.join(" · ") || full.split(",").slice(0, 2).join(" · ");

    if (!short && !full) return null;
    return { short: short || full, full: full || short, hasStreet: Boolean(road || house) };
  } catch { return null; }
}

/**
 * Reverse geocode coordinates into a readable street address. Nominatim
 * sometimes answers with only a city/area for a given zoom or exact point, so
 * retry at other detail levels (and a few metres around the fix) until a
 * street-level result comes back. The best available result is kept either way.
 */
async function reverseGeocode(c: Coords): Promise<Geo | null> {
  // ~15 m offsets — enough to snap onto the nearest addressed way.
  const d = 0.00014;
  const attempts: Array<{ c: Coords; zoom: number }> = [
    { c, zoom: 18 },
    { c, zoom: 19 },
    { c, zoom: 17 },
    { c: { lat: c.lat + d, lng: c.lng }, zoom: 18 },
    { c: { lat: c.lat - d, lng: c.lng }, zoom: 18 },
    { c: { lat: c.lat, lng: c.lng + d }, zoom: 18 },
    { c: { lat: c.lat, lng: c.lng - d }, zoom: 18 },
  ];

  let best: Geo | null = null;
  for (const attempt of attempts) {
    const g = await lookup(attempt.c, attempt.zoom);
    if (g?.hasStreet) return g;
    if (g && (!best || g.full.length > best.full.length)) best = g;
  }
  return best;
}


/**
 * Live "deliver to" info. Permission is requested ONLY when the user
 * explicitly turns location on (or when they previously turned it on).
 */
export function useCurrentLocationLabel() {
  const [label, setLabel] = useState<string>("");
  const [address, setAddress] = useState<string>("");
  const [coords, setCoords] = useState<Coords | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>("off");
  const [error, setError] = useState<string>("");
  const cancelled = useRef(false);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resolve = useCallback(async (c: Coords) => {
    setCoords(c);
    try { localStorage.setItem(COORDS_KEY, JSON.stringify(c)); } catch {}
    const g = await reverseGeocode(c);
    if (cancelled.current) return;
    // Fall back to coordinates only if geocoding is completely unavailable.
    const short = g?.short ?? `${c.lat.toFixed(4)}, ${c.lng.toFixed(4)}`;
    const full = g?.full ?? short;
    setLabel(short);
    setAddress(full);
    setStatus("ready");
    try {
      localStorage.setItem(LABEL_KEY, short);
      localStorage.setItem(ADDRESS_KEY, full);
    } catch {}
  }, []);

  const stopWatch = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    if (timer.current) { clearTimeout(timer.current); timer.current = null; }
  }, []);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("unavailable");
      setError("Location services aren't available on this device");
      return;
    }
    try { localStorage.setItem(ENABLED_KEY, "1"); } catch {}
    setStatus("detecting");
    setError("");
    stopWatch();

    // Watch briefly and keep the most accurate fix — the first GPS reading is
    // often a coarse network estimate several hundred metres off.
    let best: { c: Coords; acc: number } | null = null;
    const finish = () => {
      stopWatch();
      if (cancelled.current || !best) return;
      setAccuracy(best.acc);
      void resolve(best.c);
    };

    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        const acc = pos.coords.accuracy ?? 9999;
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        if (!best || acc < best.acc) best = { c, acc };
        // Good enough — stop early.
        if (acc <= 30) finish();
      },
      (err) => {
        if (best) { finish(); return; }
        stopWatch();
        if (err.code === err.PERMISSION_DENIED) {
          setStatus("denied");
          setError("Location permission is required to detect your address");
          try { localStorage.removeItem(ENABLED_KEY); } catch {}
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          setStatus("unavailable");
          setError("Location services are off — turn on GPS and try again");
        } else {
          setStatus("error");
          setError("Couldn't get your location. Please try again");
        }
      },
      // Always force a fresh, precise fix so the address matches where the user is now.
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 }
    );

    // Cap the convergence window so the UI never hangs.
    timer.current = setTimeout(() => {
      if (best) finish();
      else {
        stopWatch();
        setStatus("error");
        setError("Couldn't get a location fix. Move to an open area and try again");
      }
    }, 12000);
  }, [resolve, stopWatch]);


  useEffect(() => {
    cancelled.current = false;

    const cachedLabel = readLabel();
    if (cachedLabel) { setLabel(cachedLabel); setStatus("ready"); }
    const cachedAddress = readAddress();
    if (cachedAddress) setAddress(cachedAddress);
    const cached = readCoords();
    if (cached) setCoords(cached);

    // Only re-request permission automatically if the user already opted in.
    if (isLocationEnabled()) locate();

    return () => { cancelled.current = true; stopWatch(); };
  }, [locate, stopWatch]);


  const loading = status === "detecting";

  return {
    /** Short label for headers, e.g. "MG Road · Rajkot" */
    label:
      status === "detecting" && !label
        ? "Detecting your location…"
        : label || (status === "off" ? "Turn on location" : "Location off"),
    /** Full readable address, e.g. "12, MG Road, Rajkot, Gujarat 360001, India" */
    address,
    coords,
    /** Fix accuracy in metres, when reported by the device */
    accuracy,

    status,
    loading,
    error,
    enabled: status === "ready" || status === "detecting",
    /** Explicit user action — triggers the OS permission prompt */
    turnOn: locate,
    refresh: locate,
  };
}
