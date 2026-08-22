import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const COORDS_KEY = "quickbite_location";
const LABEL_KEY = "quickbite_location_label";
const ADDRESS_KEY = "quickbite_location_address";
const ENABLED_KEY = "quickbite_location_enabled";
const PARTS_KEY = "quickbite_location_parts";
const RAW_KEY = "quickbite_location_raw";
const MANUAL_KEY = "quickbite_location_manual";

export type Coords = { lat: number; lng: number };

export type LocationStatus =
  | "off" // user has not turned location on yet
  | "detecting"
  | "ready"
  | "denied"
  | "unavailable" // no geolocation support / services disabled
  | "error";

/** Structured address components, exactly as returned by the provider (never invented). */
export type AddressParts = {
  houseNumber: string;
  building: string;
  society: string;
  road: string;
  area: string;
  suburb: string;
  city: string;
  district: string;
  state: string;
  postcode: string;
  country: string;
};

/** Fields the user may fill in themselves when geocoding can't supply them. */
export type ManualParts = { houseNumber: string; building: string; society: string; landmark: string };

export const emptyParts: AddressParts = {
  houseNumber: "", building: "", society: "", road: "", area: "",
  suburb: "", city: "", district: "", state: "", postcode: "", country: "",
};

export const emptyManual: ManualParts = { houseNumber: "", building: "", society: "", landmark: "" };

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

export function readParts(): AddressParts {
  try {
    const raw = localStorage.getItem(PARTS_KEY);
    if (!raw) return emptyParts;
    return { ...emptyParts, ...(JSON.parse(raw) || {}) };
  } catch { return emptyParts; }
}

export function readManual(): ManualParts {
  try {
    const raw = localStorage.getItem(MANUAL_KEY);
    if (!raw) return emptyManual;
    return { ...emptyManual, ...(JSON.parse(raw) || {}) };
  } catch { return emptyManual; }
}

/** Raw reverse-geocoding payload kept so components can be re-mapped later. */
export function readRawGeocode(): any | null {
  try {
    const raw = localStorage.getItem(RAW_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function isLocationEnabled(): boolean {
  try { return localStorage.getItem(ENABLED_KEY) === "1"; } catch { return false; }
}

const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");

/** Map a Nominatim address object onto our structured components. */
function mapParts(data: any): AddressParts {
  const a = data?.address ?? {};
  const type = s(data?.type);
  const name = s(data?.name);

  const houseNumber = s(a.house_number);
  const building =
    s(a.house_name) || s(a.building) || s(a.apartments) ||
    (["building", "house", "apartments", "commercial", "retail"].includes(type) ? name : "") ||
    s(a.amenity) || s(a.shop) || s(a.office);
  const society = s(a.residential) || s(a.neighbourhood_block) || s(a.block) || s(a.city_block);
  const road = s(a.road) || s(a.pedestrian) || s(a.footway) || s(a.path) || s(a.cycleway) || s(a.street);
  const area = s(a.neighbourhood) || s(a.hamlet) || s(a.quarter) || s(a.industrial);
  const suburb = s(a.suburb) || s(a.city_district) || s(a.town_district) || s(a.borough);
  const city = s(a.city) || s(a.town) || s(a.village) || s(a.municipality);
  const district = s(a.state_district) || s(a.county) || s(a.district);
  const state = s(a.state) || s(a.region);
  const postcode = s(a.postcode);
  const country = s(a.country);

  return {
    houseNumber,
    building: building && building !== society ? building : building,
    society: society && society !== building ? society : "",
    road,
    area: area && area !== suburb ? area : "",
    suburb,
    city,
    district: district && district !== city ? district : "",
    state,
    postcode,
    country,
  };
}

/** One long, human-readable line built only from components that exist. */
export function formatFullAddress(p: AddressParts, manual: ManualParts = emptyManual): string {
  const house = p.houseNumber || manual.houseNumber;
  const building = p.building || manual.building;
  const society = p.society || manual.society;
  const ordered = [
    house, building, society, manual.landmark, p.road, p.area, p.suburb,
    p.city, p.district, [p.state, p.postcode].filter(Boolean).join(" "), p.country,
  ].map((x) => s(x)).filter(Boolean);
  return Array.from(new Set(ordered)).join(", ");
}

/** Short label for headers, e.g. "MG Road · Rajkot" */
export function formatShortLabel(p: AddressParts, manual: ManualParts = emptyManual): string {
  const first = [p.houseNumber || manual.houseNumber, p.road || p.building || manual.building]
    .filter(Boolean).join(", ");
  const areaish = p.area || p.suburb || p.society;
  const left = first || areaish;
  const right = p.city && p.city !== left ? p.city : "";
  return [left, right].filter(Boolean).join(" · ");
}

/** Multi-line "Deliver to" block. */
export function formatAddressLines(p: AddressParts, manual: ManualParts = emptyManual): string[] {
  const l1 = [p.houseNumber || manual.houseNumber, p.building || manual.building, p.society || manual.society]
    .filter(Boolean).join(", ");
  const l2 = [p.road, p.area || p.suburb].filter(Boolean).join(", ");
  const l3 = [p.city, [p.state, p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
  const l4 = [p.district && p.district !== p.city ? p.district : "", p.country].filter(Boolean).join(", ");
  return [l1, l2, l3, l4].filter(Boolean);
}

type Geo = { parts: AddressParts; raw: any; hasStreet: boolean; display: string };

/** One reverse-geocode lookup at a given detail zoom. */
async function lookup(c: Coords, zoom: number): Promise<Geo | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=${zoom}&addressdetails=1&extratags=1&namedetails=1&accept-language=en`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    if (!data || data.error) return null;
    const parts = mapParts(data);
    const filled = Object.values(parts).filter(Boolean).length;
    if (!filled) return null;
    return {
      parts,
      raw: data,
      hasStreet: Boolean(parts.road || parts.houseNumber || parts.building),
      display: s(data.display_name),
    };
  } catch { return null; }
}

/**
 * Reverse geocode coordinates into a detailed address. Nominatim sometimes
 * answers with only a city/area for a given zoom or exact point, so retry at
 * other detail levels (and a few metres around the fix) until a street-level
 * result comes back. Component data from coarser answers is merged in so that
 * city/district/state/PIN are never lost.
 */
async function reverseGeocode(c: Coords): Promise<Geo | null> {
  const d = 0.00014; // ~15 m — enough to snap onto the nearest addressed way
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
  const merged: AddressParts = { ...emptyParts };

  for (const attempt of attempts) {
    const g = await lookup(attempt.c, attempt.zoom);
    if (!g) continue;
    for (const k of Object.keys(merged) as (keyof AddressParts)[]) {
      if (!merged[k] && g.parts[k]) merged[k] = g.parts[k];
    }
    if (!best || Object.values(g.parts).filter(Boolean).length > Object.values(best.parts).filter(Boolean).length) {
      best = g;
    }
    if (g.hasStreet) break;
  }

  if (!best) return null;
  return { ...best, parts: { ...merged }, hasStreet: Boolean(merged.road || merged.houseNumber) };
}

/** Forward geocoding for the manual "search an address" fallback. */
export type AddressSuggestion = { label: string; coords: Coords; parts: AddressParts; raw: any };

export async function searchAddress(query: string): Promise<AddressSuggestion[]> {
  const q = query.trim();
  if (q.length < 3) return [];
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=in&accept-language=en`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data: any[] = await res.json();
    return (Array.isArray(data) ? data : []).map((d) => ({
      label: s(d.display_name),
      coords: { lat: Number(d.lat), lng: Number(d.lon) },
      parts: mapParts(d),
      raw: d,
    }));
  } catch { return []; }
}

/**
 * Live "deliver to" info. Permission is requested ONLY when the user
 * explicitly turns location on (or when they previously turned it on).
 */
export function useCurrentLocationLabel() {
  const [parts, setParts] = useState<AddressParts>(emptyParts);
  const [manual, setManualState] = useState<ManualParts>(emptyManual);
  const [raw, setRaw] = useState<any | null>(null);
  const [coords, setCoords] = useState<Coords | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [status, setStatus] = useState<LocationStatus>("off");
  const [error, setError] = useState<string>("");
  const cancelled = useRef(false);
  const watchId = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((p: AddressParts, m: ManualParts, rawData: any | null) => {
    try {
      localStorage.setItem(PARTS_KEY, JSON.stringify(p));
      localStorage.setItem(MANUAL_KEY, JSON.stringify(m));
      localStorage.setItem(LABEL_KEY, formatShortLabel(p, m));
      localStorage.setItem(ADDRESS_KEY, formatFullAddress(p, m));
      if (rawData) localStorage.setItem(RAW_KEY, JSON.stringify(rawData));
    } catch {}
  }, []);

  const setManual = useCallback((next: Partial<ManualParts>) => {
    setManualState((prev) => {
      const merged = { ...prev, ...next };
      setParts((p) => { persist(p, merged, null); return p; });
      return merged;
    });
  }, [persist]);

  const resolve = useCallback(async (c: Coords) => {
    setCoords(c);
    try { localStorage.setItem(COORDS_KEY, JSON.stringify(c)); } catch {}
    const g = await reverseGeocode(c);
    if (cancelled.current) return;
    if (!g) {
      // Geocoding unavailable — keep the exact coordinates so ordering still works.
      setStatus("ready");
      setError("Couldn't look up the address — you can enter it manually");
      return;
    }
    setParts(g.parts);
    setRaw(g.raw);
    setStatus("ready");
    setError("");
    setManualState((m) => { persist(g.parts, m, g.raw); return m; });
  }, [persist]);

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

  /** Apply a manually searched address (fallback when GPS can't be used). */
  const applySuggestion = useCallback((sug: AddressSuggestion) => {
    stopWatch();
    setParts(sug.parts);
    setRaw(sug.raw);
    setCoords(sug.coords);
    setAccuracy(null);
    setStatus("ready");
    setError("");
    try { localStorage.setItem(COORDS_KEY, JSON.stringify(sug.coords)); } catch {}
    setManualState((m) => { persist(sug.parts, m, sug.raw); return m; });
  }, [persist, stopWatch]);

  useEffect(() => {
    cancelled.current = false;

    const cachedParts = readParts();
    const cachedManual = readManual();
    setManualState(cachedManual);
    if (Object.values(cachedParts).some(Boolean)) {
      setParts(cachedParts);
      setStatus("ready");
    }
    setRaw(readRawGeocode());
    const cached = readCoords();
    if (cached) setCoords(cached);

    // Only re-request permission automatically if the user already opted in.
    if (isLocationEnabled()) locate();

    return () => { cancelled.current = true; stopWatch(); };
  }, [locate, stopWatch]);

  const loading = status === "detecting";
  const address = useMemo(() => formatFullAddress(parts, manual), [parts, manual]);
  const lines = useMemo(() => formatAddressLines(parts, manual), [parts, manual]);
  const shortLabel = useMemo(() => formatShortLabel(parts, manual), [parts, manual]);

  return {
    /** Short label for headers, e.g. "MG Road · Rajkot" */
    label:
      status === "detecting" && !shortLabel
        ? "Detecting your location…"
        : shortLabel || (status === "off" ? "Turn on location" : "Location off"),
    /** Full readable address with every available component */
    address,
    /** Multi-line "Deliver to" block */
    lines,
    /** Structured components straight from the provider */
    parts,
    /** User-entered fields (flat/building/society/landmark) */
    manual,
    setManual,
    /** Raw reverse-geocoding payload */
    raw,
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
    /** Manual fallback */
    searchAddress,
    applySuggestion,
  };
}
