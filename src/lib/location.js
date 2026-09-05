import { useCallback, useEffect, useMemo, useRef, useState } from "react";
const COORDS_KEY = "quickbite_location";
const LABEL_KEY = "quickbite_location_label";
const ADDRESS_KEY = "quickbite_location_address";
const ENABLED_KEY = "quickbite_location_enabled";
const PARTS_KEY = "quickbite_location_parts";
const RAW_KEY = "quickbite_location_raw";
const MANUAL_KEY = "quickbite_location_manual";
export const emptyParts = {
    houseNumber: "", building: "", society: "", road: "", area: "",
    suburb: "", city: "", district: "", state: "", postcode: "", country: "",
};
export const emptyManual = { houseNumber: "", building: "", society: "", landmark: "" };
export function readCoords() {
    try {
        const raw = localStorage.getItem(COORDS_KEY);
        if (!raw)
            return null;
        const c = JSON.parse(raw);
        if (typeof c?.lat === "number" && typeof c?.lng === "number")
            return c;
        return null;
    }
    catch {
        return null;
    }
}
export function readLabel() {
    try {
        return localStorage.getItem(LABEL_KEY) || "";
    }
    catch {
        return "";
    }
}
export function readAddress() {
    try {
        return localStorage.getItem(ADDRESS_KEY) || "";
    }
    catch {
        return "";
    }
}
export function readParts() {
    try {
        const raw = localStorage.getItem(PARTS_KEY);
        if (!raw)
            return emptyParts;
        return { ...emptyParts, ...(JSON.parse(raw) || {}) };
    }
    catch {
        return emptyParts;
    }
}
export function readManual() {
    try {
        const raw = localStorage.getItem(MANUAL_KEY);
        if (!raw)
            return emptyManual;
        return { ...emptyManual, ...(JSON.parse(raw) || {}) };
    }
    catch {
        return emptyManual;
    }
}
/** Raw reverse-geocoding payload kept so components can be re-mapped later. */
export function readRawGeocode() {
    try {
        const raw = localStorage.getItem(RAW_KEY);
        return raw ? JSON.parse(raw) : null;
    }
    catch {
        return null;
    }
}
export function isLocationEnabled() {
    try {
        return localStorage.getItem(ENABLED_KEY) === "1";
    }
    catch {
        return false;
    }
}
const s = (v) => (typeof v === "string" ? v.trim() : "");
/** Map a Nominatim address object onto our structured components. */
function mapParts(data) {
    const a = data?.address ?? {};
    const type = s(data?.type);
    const name = s(data?.name);
    const houseNumber = s(a.house_number);
    const building = s(a.house_name) || s(a.building) || s(a.apartments) ||
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
export function formatFullAddress(p, manual = emptyManual) {
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
export function formatShortLabel(p, manual = emptyManual) {
    const first = [p.houseNumber || manual.houseNumber, p.road || p.building || manual.building]
        .filter(Boolean).join(", ");
    const areaish = p.area || p.suburb || p.society;
    const left = first || areaish;
    const right = p.city && p.city !== left ? p.city : "";
    return [left, right].filter(Boolean).join(" · ");
}
/** Multi-line "Deliver to" block. */
export function formatAddressLines(p, manual = emptyManual) {
    const l1 = [p.houseNumber || manual.houseNumber, p.building || manual.building, p.society || manual.society]
        .filter(Boolean).join(", ");
    const l2 = [p.road, p.area || p.suburb].filter(Boolean).join(", ");
    const l3 = [p.city, [p.state, p.postcode].filter(Boolean).join(" ")].filter(Boolean).join(", ");
    const l4 = [p.district && p.district !== p.city ? p.district : "", p.country].filter(Boolean).join(", ");
    return [l1, l2, l3, l4].filter(Boolean);
}
/** Convert BigDataCloud's key/value administrative list into address fields. */
function mapBigDataCloudParts(data) {
    const administrative = Array.isArray(data?.localityInfo?.administrative)
        ? data.localityInfo.administrative
        : [];
    const names = administrative.map((item) => s(item?.name)).filter(Boolean);
    const city = s(data?.city) || s(data?.locality) || s(data?.principalSubdivision);
    const state = s(data?.principalSubdivision);
    const district = names.find((name) => name !== city && name !== state) || "";
    const parts = {
        ...emptyParts,
        road: s(data?.localityInfo?.informative?.[0]?.name),
        area: s(data?.locality) || s(data?.localityInfo?.informative?.[1]?.name),
        city,
        district,
        state,
        postcode: s(data?.postcode),
        country: s(data?.countryName),
    };
    return { parts, filled: Object.values(parts).filter(Boolean).length };
}
/** One reverse-geocode lookup at a given detail zoom. No API key is required. */
async function lookup(c, zoom) {
    try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${c.lat}&lon=${c.lng}&zoom=${zoom}&addressdetails=1&extratags=1&namedetails=1&accept-language=en`;
        const broadUrl = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${c.lat}&longitude=${c.lng}&localityLanguage=en`;
        const responses = await Promise.allSettled([
            fetch(nominatimUrl, { headers: { Accept: "application/json" } }),
            fetch(broadUrl, { headers: { Accept: "application/json" } }),
        ]);
        const nominatimResponse = responses[0].status === "fulfilled" ? responses[0].value : null;
        if (nominatimResponse?.ok) {
            const data = await nominatimResponse.json();
            if (data && !data.error) {
                const parts = mapParts(data);
                const filled = Object.values(parts).filter(Boolean).length;
                if (filled) {
                    return {
                        parts,
                        raw: { provider: "nominatim", response: data },
                        hasStreet: Boolean(parts.road || parts.houseNumber || parts.building),
                        display: s(data.display_name),
                    };
                }
            }
        }
        const broadResponse = responses[1].status === "fulfilled" ? responses[1].value : null;
        if (broadResponse?.ok) {
            const data = await broadResponse.json();
            const mapped = mapBigDataCloudParts(data);
            if (mapped.filled) {
                return {
                    parts: mapped.parts,
                    raw: { provider: "bigdatacloud", response: data },
                    hasStreet: Boolean(mapped.parts.road),
                    display: [data?.locality, data?.city, data?.principalSubdivision, data?.postcode]
                        .map(s).filter(Boolean).join(", "),
                };
            }
        }
        return null;
    }
    catch {
        return null;
    }
}
/**
 * Build a ring of points around the fix at a given radius (metres), used to
 * probe nearby tagged roads/buildings when the exact point has no address
 * data of its own. 8 compass directions gives much better odds than 4 in
 * areas with patchy OSM coverage (common for Indian residential streets).
 */
function ring(c, metres) {
    const dLat = metres / 111320; // ~metres per degree latitude
    const dLng = metres / (111320 * Math.cos((c.lat * Math.PI) / 180) || 1);
    const dirs = [
        [1, 0], [-1, 0], [0, 1], [0, -1],
        [0.7071, 0.7071], [0.7071, -0.7071], [-0.7071, 0.7071], [-0.7071, -0.7071],
    ];
    return dirs.map(([latMul, lngMul]) => ({
        lat: c.lat + dLat * latMul,
        lng: c.lng + dLng * lngMul,
    }));
}
/**
 * Reverse geocode coordinates into a detailed address. Nominatim sometimes
 * answers with only a city/area for a given zoom or exact point, so retry at
 * other detail levels and progressively wider rings of nearby points (15m,
 * then 40m) until a street-level result comes back. Component data from
 * coarser answers is merged in so that city/district/state/PIN are never
 * lost even when a street-level match is found only nearby.
 *
 * Note: if OpenStreetMap simply has no house_number/road tag anywhere near
 * a location (common for many Indian housing societies), no amount of
 * retrying can produce data that doesn't exist upstream — that's the
 * remaining gap the "Flat / building" manual entry in LocationCard covers.
 */
async function reverseGeocode(c) {
    const attempts = [
        { c, zoom: 19 },
        { c, zoom: 18 },
        { c, zoom: 17 },
        ...ring(c, 15).map((p) => ({ c: p, zoom: 18 })),
        ...ring(c, 40).map((p) => ({ c: p, zoom: 18 })),
    ];
    let best = null;
    const merged = { ...emptyParts };
    for (const attempt of attempts) {
        const g = await lookup(attempt.c, attempt.zoom);
        if (!g)
            continue;
        for (const k of Object.keys(merged)) {
            if (!merged[k] && g.parts[k])
                merged[k] = g.parts[k];
        }
        if (!best || Object.values(g.parts).filter(Boolean).length > Object.values(best.parts).filter(Boolean).length) {
            best = g;
        }
        if (g.hasStreet)
            break;
    }
    if (!best)
        return null;
    return { ...best, parts: { ...merged }, hasStreet: Boolean(merged.road || merged.houseNumber) };
}
export async function searchAddress(query) {
    const q = query.trim();
    if (q.length < 3)
        return [];
    try {
        const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(q)}&addressdetails=1&limit=6&countrycodes=in&accept-language=en`, { headers: { Accept: "application/json" } });
        if (!res.ok)
            return [];
        const data = await res.json();
        return (Array.isArray(data) ? data : []).map((d) => ({
            label: s(d.display_name),
            coords: { lat: Number(d.lat), lng: Number(d.lon) },
            parts: mapParts(d),
            raw: d,
        }));
    }
    catch {
        return [];
    }
}
/**
 * Live "deliver to" info. Permission is requested ONLY when the user
 * explicitly turns location on (or when they previously turned it on).
 */
export function useCurrentLocationLabel() {
    const [parts, setParts] = useState(emptyParts);
    const [manual, setManualState] = useState(emptyManual);
    const [raw, setRaw] = useState(null);
    const [coords, setCoords] = useState(null);
    const [accuracy, setAccuracy] = useState(null);
    const [status, setStatus] = useState("off");
    const [error, setError] = useState("");
    const cancelled = useRef(false);
    const watchId = useRef(null);
    const timer = useRef(null);
    const persist = useCallback((p, m, rawData) => {
        try {
            localStorage.setItem(PARTS_KEY, JSON.stringify(p));
            localStorage.setItem(MANUAL_KEY, JSON.stringify(m));
            localStorage.setItem(LABEL_KEY, formatShortLabel(p, m));
            localStorage.setItem(ADDRESS_KEY, formatFullAddress(p, m));
            if (rawData)
                localStorage.setItem(RAW_KEY, JSON.stringify(rawData));
        }
        catch { }
    }, []);
    const setManual = useCallback((next) => {
        setManualState((prev) => {
            const merged = { ...prev, ...next };
            setParts((p) => { persist(p, merged, null); return p; });
            return merged;
        });
    }, [persist]);
    const resolve = useCallback(async (c) => {
        setCoords(c);
        try {
            localStorage.setItem(COORDS_KEY, JSON.stringify(c));
        }
        catch { }
        const g = await reverseGeocode(c);
        if (cancelled.current)
            return;
        if (!g) {
            // Geocoding unavailable — keep the exact GPS coordinates. Never invent an address.
            setStatus("ready");
            setError("GPS location detected, but the address service is unavailable. Enter your address manually.");
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
        if (timer.current) {
            clearTimeout(timer.current);
            timer.current = null;
        }
    }, []);
    const locate = useCallback(() => {
        if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
            setStatus("unavailable");
            setError("Location services aren't available on this device");
            return;
        }
        try {
            localStorage.setItem(ENABLED_KEY, "1");
        }
        catch { }
        setStatus("detecting");
        setError("");
        stopWatch();
        // Watch briefly and keep the most accurate fix — the first GPS reading is
        // often a coarse network estimate several hundred metres off.
        let best = null;
        const finish = () => {
            stopWatch();
            if (cancelled.current || !best)
                return;
            setAccuracy(best.acc);
            void resolve(best.c);
        };
        watchId.current = navigator.geolocation.watchPosition((pos) => {
            const acc = pos.coords.accuracy ?? 9999;
            const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
            if (!best || acc < best.acc)
                best = { c, acc };
            // Good enough — stop early.
            if (acc <= 30)
                finish();
        }, (err) => {
            if (best) {
                finish();
                return;
            }
            stopWatch();
            if (err.code === err.PERMISSION_DENIED) {
                setStatus("denied");
                setError("Location permission is required to detect your address");
                try {
                    localStorage.removeItem(ENABLED_KEY);
                }
                catch { }
            }
            else if (err.code === err.POSITION_UNAVAILABLE) {
                setStatus("unavailable");
                setError("Location services are off — turn on GPS and try again");
            }
            else {
                setStatus("error");
                setError("Couldn't get your location. Please try again");
            }
        }, 
        // Always force a fresh, precise fix so the address matches where the user is now.
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 });
        // Cap the convergence window so the UI never hangs.
        timer.current = setTimeout(() => {
            if (best)
                finish();
            else {
                stopWatch();
                setStatus("error");
                setError("Couldn't get a location fix. Move to an open area and try again");
            }
        }, 12000);
    }, [resolve, stopWatch]);
    /** Apply a manually searched address (fallback when GPS can't be used). */
    const applySuggestion = useCallback((sug) => {
        stopWatch();
        setParts(sug.parts);
        setRaw(sug.raw);
        setCoords(sug.coords);
        setAccuracy(null);
        setStatus("ready");
        setError("");
        try {
            localStorage.setItem(COORDS_KEY, JSON.stringify(sug.coords));
        }
        catch { }
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
        if (cached) {
            setCoords(cached);
            if (!Object.values(cachedParts).some(Boolean))
                setStatus("ready");
        }
        // Only re-request permission automatically if the user already opted in.
        if (isLocationEnabled())
            locate();
        return () => { cancelled.current = true; stopWatch(); };
    }, [locate, stopWatch]);
    const loading = status === "detecting";
    const address = useMemo(() => formatFullAddress(parts, manual), [parts, manual]);
    const lines = useMemo(() => formatAddressLines(parts, manual), [parts, manual]);
    const shortLabel = useMemo(() => formatShortLabel(parts, manual), [parts, manual]);
    return {
        /** Short label for headers, e.g. "MG Road · Rajkot" */
        label: status === "detecting" && !shortLabel
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
