import { useEffect, useState } from "react";

const COORDS_KEY = "quickbite_location";
const LABEL_KEY = "quickbite_location_label";

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

async function reverseGeocode(c: Coords): Promise<string | null> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=16&addressdetails=1`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return null;
    const data: any = await res.json();
    const a = data?.address ?? {};
    const area =
      a.neighbourhood || a.suburb || a.road || a.village || a.town || a.city_district || a.city;
    const city = a.city || a.town || a.village || a.state_district || a.state;
    const label = [area, city && city !== area ? city : null].filter(Boolean).join(" · ");
    return label || data?.display_name?.split(",").slice(0, 2).join(" · ") || null;
  } catch { return null; }
}

/** Live "deliver to" label based on the device's current location. */
export function useCurrentLocationLabel() {
  const [label, setLabel] = useState<string>("");
  const [loading, setLoading] = useState(false);


  useEffect(() => {
    let cancelled = false;

    const resolve = async (c: Coords) => {
      const l = await reverseGeocode(c);
      if (cancelled) return;
      const next = l ?? `${c.lat.toFixed(3)}, ${c.lng.toFixed(3)}`;
      setLabel(next);
      try { localStorage.setItem(LABEL_KEY, next); } catch {}
    };

    const cachedLabel = readLabel();
    if (cachedLabel) setLabel(cachedLabel);

    const cached = readCoords();
    if (cached) void resolve(cached);


    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      if (!cached && !label) setLabel("Location unavailable");
      return () => { cancelled = true; };
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLoading(false);
        const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        try { localStorage.setItem(COORDS_KEY, JSON.stringify(c)); } catch {}
        void resolve(c);
      },
      () => {
        setLoading(false);
        if (!cached && !label) setLabel("Location off");
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 }
    );

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { label: label || "Locating…", loading };
}
