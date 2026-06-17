import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Phone, MessageCircle, CheckCircle2 } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useEffect, useRef, useState } from "react";

export const Route = createFileRoute("/track")({
  head: () => ({
    meta: [{ title: "Track Order – QuickBite" }],
  }),
  component: TrackPage,
});

// Customer (destination) and restaurant (start)
const CUSTOMER: [number, number] = [19.076, 72.8777];
const RESTAURANT: [number, number] = [19.09, 72.86];

const steps = [
  { label: "Order confirmed", desc: "Restaurant accepted your order" },
  { label: "Preparing food", desc: "Chef is cooking your meal" },
  { label: "Out for delivery", desc: "Courier is on the way" },
  { label: "Delivered", desc: "Enjoy your meal!" },
];

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function TrackPage() {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<any>(null);
  const courierMarker = useRef<any>(null);
  const routeLine = useRef<any>(null);
  const [progress, setProgress] = useState(0); // 0..1
  const [stepIdx, setStepIdx] = useState(2);

  useEffect(() => {
    let mounted = true;
    let interval: any;
    (async () => {
      const L = (await import("leaflet")).default;
      if (!mounted || !mapRef.current) return;

      const map = L.map(mapRef.current, {
        zoomControl: false,
        attributionControl: false,
      }).setView([(CUSTOMER[0] + RESTAURANT[0]) / 2, (CUSTOMER[1] + RESTAURANT[1]) / 2], 13);
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
        html: `<div style="width:38px;height:38px;border-radius:50%;background:#fff;display:flex;align-items:center;justify-content:center;font-size:20px;box-shadow:0 6px 16px rgba(0,0,0,.2);border:3px solid #8b5cf6">🛵</div>`,
        iconSize: [38, 38],
        iconAnchor: [19, 19],
      });

      L.marker(CUSTOMER, { icon: customerIcon }).addTo(map);
      L.marker(RESTAURANT, { icon: restaurantIcon }).addTo(map);

      routeLine.current = L.polyline([RESTAURANT, CUSTOMER], {
        color: "#8b5cf6",
        weight: 4,
        opacity: 0.6,
        dashArray: "8,8",
      }).addTo(map);

      courierMarker.current = L.marker(RESTAURANT, { icon: courierIcon }).addTo(map);

      map.fitBounds([RESTAURANT, CUSTOMER], { padding: [50, 50] });

      interval = setInterval(() => {
        setProgress((p) => {
          const next = Math.min(1, p + 0.02);
          if (courierMarker.current) {
            const lat = lerp(RESTAURANT[0], CUSTOMER[0], next);
            const lng = lerp(RESTAURANT[1], CUSTOMER[1], next);
            courierMarker.current.setLatLng([lat, lng]);
          }
          if (next >= 1) setStepIdx(3);
          else if (next > 0.05) setStepIdx(2);
          return next;
        });
      }, 600);
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

  const etaMin = Math.max(1, Math.round((1 - progress) * 15));

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
      </div>

      <div className="px-5 -mt-6 relative">
        <div className="bg-white rounded-3xl p-5 shadow-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-500">Arriving in</p>
              <p className="text-2xl font-black text-slate-900">{etaMin} min</p>
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
    </MobileShell>
  );
}
