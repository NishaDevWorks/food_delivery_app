import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, MessageCircle, CheckCircle2, Star, Radio, LocateFixed, MapPin } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useEffect, useMemo, useRef, useState } from "react";
import { addReview } from "@/lib/reviews";
import { updateOrder } from "@/lib/orders";
import { useCurrentLocationLabel } from "@/lib/location";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [{ title: "Track Order – QuickBite" }],
  }),
  component: TrackPage,
});

const INDIA_CENTER: [number, number] = [20.5937, 78.9629];

const steps = [
  { label: "Order confirmed", desc: "Restaurant accepted your order" },
  { label: "Preparing food", desc: "Chef is cooking your meal" },
  { label: "Out for delivery", desc: "Courier is on the way" },
  { label: "Delivered", desc: "Enjoy your meal!" },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}
// ease in-out for a more natural courier movement
function easeInOut(t: number) {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

function TrackPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const customerMarker = useRef<any>(null);
  const restaurantMarker = useRef<any>(null);
  const courierMarker = useRef<any>(null);
  const fullRoute = useRef<any>(null);
  const traveledLine = useRef<any>(null);
  const startRef = useRef<[number, number] | null>(null);
  const endRef = useRef<[number, number] | null>(null);

  const location = useCurrentLocationLabel();
  const customer = useMemo<[number, number] | null>(
    () => (location.coords ? [location.coords.lat, location.coords.lng] : null),
    [location.coords]
  );
  const [restaurant, setRestaurant] = useState<[number, number] | null>(null);

  const [progress, setProgress] = useState(0);
  const [stepIdx, setStepIdx] = useState(1);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [reviewed, setReviewed] = useState(false);
  const [activeOrder, setActiveOrder] = useState<any>(null);
  const [liveConnected, setLiveConnected] = useState(false);

  // Derive a deterministic demo restaurant location near the customer's real location.
  useEffect(() => {
    if (!customer) {
      setRestaurant(null);
      return;
    }
    const id = activeOrder?.items?.[0]?.restaurantId || "demo";
    const hash = id.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const latOff = 0.005 + ((hash % 10) * 0.001);
    const lngOff = 0.005 + (((hash * 7) % 10) * 0.001);
    setRestaurant([customer[0] + latOff, customer[1] + lngOff]);
  }, [customer, activeOrder?.items?.[0]?.restaurantId]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("quickbite_active_order");
      if (raw) setActiveOrder(JSON.parse(raw));
    } catch {}
  }, []);

  // Realtime sync: reflect status changes made from any device
  useEffect(() => {
    if (!activeOrder?.id) return;
    const isUuid = /^[0-9a-f-]{36}$/i.test(activeOrder.id);
    if (!isUuid) return; // local-only order (not synced to cloud)

    const channel = supabase
      .channel(`order-${activeOrder.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders", filter: `id=eq.${activeOrder.id}` },
        (payload) => {
          const row: any = payload.new;
          const remoteStatus = row.status as "preparing" | "out_for_delivery" | "delivered";
          if (remoteStatus === "delivered") setStepIdx(3);
          else if (remoteStatus === "out_for_delivery") setStepIdx((s) => Math.max(s, 2));
          const merged = { ...activeOrder, status: remoteStatus, paymentStatus: row.payment_status };
          setActiveOrder(merged);
          try { localStorage.setItem("quickbite_active_order", JSON.stringify(merged)); } catch {}
        },
      )
      .subscribe((status) => setLiveConnected(status === "SUBSCRIBED"));

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrder?.id]);

  // Initialise Leaflet map once.
  useEffect(() => {
    let mounted = true;
    let interval: any;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mounted || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView(INDIA_CENTER, 5);
      mapInstance.current = map;

      L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png", {
        maxZoom: 19,
      }).addTo(map);

      const customerIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#8b5cf6,#ec4899);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;box-shadow:0 4px 12px rgba(236,72,153,.45);border:3px solid #fff">🏠</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const restaurantIcon = L.divIcon({
        className: "",
        html: `<div style="width:32px;height:32px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#ef4444);display:flex;align-items:center;justify-content:center;color:#fff;font-size:16px;box-shadow:0 4px 12px rgba(239,68,68,.45);border:3px solid #fff">🍴</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
      });
      const courierIcon = L.divIcon({
        className: "",
        html: `<div style="position:relative;width:42px;height:42px;display:flex;align-items:center;justify-content:center">
                 <div style="position:absolute;inset:-6px;border-radius:50%;background:rgba(139,92,246,.25);animation:qbpulse 1.4s ease-out infinite"></div>
                 <div style="position:relative;width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px rgba(0,0,0,.2);border:3px solid #8b5cf6">🛵</div>
               </div>
               <style>@keyframes qbpulse{0%{transform:scale(.6);opacity:.8}100%{transform:scale(1.6);opacity:0}}</style>`,
        iconSize: [42, 42],
        iconAnchor: [21, 21],
      });

      customerMarker.current = L.marker([0, 0], { icon: customerIcon });
      restaurantMarker.current = L.marker([0, 0], { icon: restaurantIcon });
      courierMarker.current = L.marker([0, 0], { icon: courierIcon });
      fullRoute.current = L.polyline([], {
        color: "#cbd5e1",
        weight: 4,
        opacity: 0.8,
        dashArray: "6,8",
      });
      traveledLine.current = L.polyline([], {
        color: "#8b5cf6",
        weight: 5,
        opacity: 0.9,
      });

      interval = setInterval(() => {
        setProgress((p) => {
          if (!startRef.current || !endRef.current) return p;
          const next = Math.min(1, p + 0.01);
          const t = easeInOut(next);
          if (courierMarker.current) {
            const lat = lerp(startRef.current[0], endRef.current[0], t);
            const lng = lerp(startRef.current[1], endRef.current[1], t);
            courierMarker.current.setLatLng([lat, lng]);
            if (traveledLine.current) {
              traveledLine.current.setLatLngs([startRef.current, [lat, lng]]);
            }
          }
          if (next >= 1) setStepIdx(3);
          else if (next > 0.05) setStepIdx(2);
          else setStepIdx(1);
          return next;
        });
      }, 250);
    })();
    return () => {
      mounted = false;
      clearInterval(interval);
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Update map view, markers and route whenever the user's real location (or the derived restaurant point) changes.
  useEffect(() => {
    const map = mapInstance.current;
    if (!map) return;

    if (customer && restaurant) {
      startRef.current = restaurant;
      endRef.current = customer;

      customerMarker.current.setLatLng(customer).addTo(map);
      restaurantMarker.current.setLatLng(restaurant).addTo(map);
      courierMarker.current.setLatLng(restaurant).addTo(map);
      fullRoute.current.setLatLngs([restaurant, customer]).addTo(map);
      traveledLine.current.setLatLngs([restaurant]).addTo(map);

      map.fitBounds([restaurant, customer], { padding: [50, 50] });
      setProgress(0);
    } else if (customer) {
      endRef.current = customer;
      customerMarker.current.setLatLng(customer).addTo(map);
      map.setView(customer, 13);
    } else {
      map.setView(INDIA_CENTER, 5);
    }
  }, [customer, restaurant]);

  // When delivered, update order status + prompt review once
  useEffect(() => {
    if (stepIdx === 3 && activeOrder && activeOrder.status !== "delivered") {
      try {
        updateOrder(activeOrder.id, { status: "delivered" });
        const updated = { ...activeOrder, status: "delivered" };
        localStorage.setItem("quickbite_active_order", JSON.stringify(updated));
        setActiveOrder(updated);
      } catch {}
      if (!reviewed) setReviewOpen(true);
    }
  }, [stepIdx, activeOrder, reviewed]);

  function submitReview() {
    if (!activeOrder) return;
    const restaurantId = activeOrder.items?.[0]?.restaurantId;
    if (!restaurantId) {
      setReviewOpen(false);
      return;
    }
    addReview({
      restaurantId,
      rating,
      comment: comment.trim(),
      author: "You",
    });
    setReviewed(true);
    setReviewOpen(false);
    toast.success("Thanks for the review!");
  }

  const etaMin = Math.max(0, Math.round((1 - progress) * 15));
  const delivered = stepIdx === 3;
  const locationReady = !!customer;

  return (
    <MobileShell>
      <div className="relative">
        <div ref={mapRef} className="w-full h-[360px] bg-slate-100" />
        <Link
          to="/home"
          className="absolute top-5 left-5 w-10 h-10 rounded-full bg-white/95 shadow-lg flex items-center justify-center z-[500]"
        >
          <ArrowLeft className="w-5 h-5 text-slate-700" />
        </Link>

        {!locationReady && (
          <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center text-center px-6 z-[400]">
            <div className="w-14 h-14 rounded-2xl bg-violet-100 text-violet-600 flex items-center justify-center mb-3">
              <MapPin className="w-7 h-7" />
            </div>
            <p className="text-sm font-bold text-slate-800">Location is off</p>
            <p className="text-xs text-slate-500 mt-1 max-w-[260px]">
              Turn on location so we can show your order on the map near your real address.
            </p>
            <button
              onClick={location.turnOn}
              disabled={location.loading}
              className="mt-4 inline-flex items-center gap-1.5 h-10 px-5 rounded-full bg-gradient-to-r from-violet-500 to-pink-500 text-white text-[12px] font-bold shadow disabled:opacity-60"
            >
              {location.loading ? (
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <LocateFixed className="w-3.5 h-3.5" />
              )}
              {location.loading ? "Detecting…" : "Turn On Location"}
            </button>
          </div>
        )}
      </div>

      <div className="px-5 -mt-6 relative">
        <div className="bg-white rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {delivered ? "Status" : "Arriving in"}
                {liveConnected && (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full">
                    <Radio className="w-2.5 h-2.5" /> LIVE
                  </span>
                )}
              </p>
              <p className="text-2xl font-black text-slate-900">
                {delivered ? "Delivered 🎉" : `${etaMin} min`}
              </p>
            </div>
            <div className="flex gap-2">
              <button className="w-10 h-10 rounded-xl bg-violet-100 text-violet-600 flex items-center justify-center">
                <MessageCircle className="w-5 h-5" />
              </button>
              <button className="w-10 h-10 rounded-xl bg-pink-100 text-pink-600 flex items-center justify-center">
                <Phone className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3 p-3 bg-slate-50 rounded-2xl">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-violet-400 to-pink-400 flex items-center justify-center text-white font-bold">
              A
            </div>
            <div className="flex-1">
              <p className="text-sm font-semibold text-slate-800">Aman · Courier</p>
              <p className="text-[11px] text-slate-500">Bike · MH 12 AB 4567</p>
            </div>
            <span className="text-xs font-bold text-emerald-600">★ 4.9</span>
          </div>

          {delivered && !reviewed && (
            <button
              onClick={() => setReviewOpen(true)}
              className="mt-4 w-full h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-md shadow-pink-200"
            >
              ⭐ Rate your order
            </button>
          )}

          {reviewed && activeOrder?.items?.[0]?.restaurantId && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-50 border border-emerald-200">
              <div className="flex items-center gap-1 mb-1">
                {[1,2,3,4,5].map((n) => (
                  <Star key={n} className={`w-4 h-4 ${n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
                ))}
                <span className="ml-1 text-xs font-semibold text-emerald-700">Your review posted</span>
              </div>
              {comment && <p className="text-xs text-slate-700">"{comment}"</p>}
              <Link
                to="/restaurant/$id"
                params={{ id: activeOrder.items[0].restaurantId }}
                className="mt-2 inline-block text-xs font-bold text-violet-600"
              >
                View on restaurant page →
              </Link>
            </div>
          )}

        </div>

        <h3 className="mt-6 font-bold text-slate-800">Order status</h3>
        <div className="mt-3 space-y-3">
          {steps.map((s, i) => {
            const done = i <= stepIdx;
            return (
              <div key={s.label} className="flex items-start gap-3">
                <div
                  className={`mt-0.5 w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${
                    done
                      ? "bg-gradient-to-br from-violet-500 to-pink-500 text-white"
                      : "bg-slate-200 text-slate-400"
                  }`}
                >
                  {done ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs">{i + 1}</span>}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${done ? "text-slate-900" : "text-slate-400"}`}>
                    {s.label}
                  </p>
                  <p className="text-[11px] text-slate-500">{s.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
        <DialogContent className="sm:max-w-[400px] rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-black text-slate-900">How was your order?</DialogTitle>
            <DialogDescription>Your feedback helps the restaurant improve.</DialogDescription>
          </DialogHeader>
          <div className="flex justify-center gap-2 my-3">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setRating(n)} aria-label={`Rate ${n}`}>
                <Star
                  className={`w-9 h-9 ${
                    n <= rating ? "fill-amber-400 text-amber-400" : "text-slate-300"
                  }`}
                />
              </button>
            ))}
          </div>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Tell us more (optional)"
            rows={3}
            className="w-full p-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
          />
          <button
            onClick={submitReview}
            className="mt-2 w-full py-3 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold"
          >
            Submit review
          </button>
        </DialogContent>
      </Dialog>
    </MobileShell>
  );
}
