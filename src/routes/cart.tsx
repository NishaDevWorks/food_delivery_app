import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Banknote, Tag, X, ShieldCheck, MapPin } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { RazorpayCheckout, type RzpMethod } from "@/components/RazorpayCheckout";
import { useCart } from "@/lib/cart";
import { findCoupon, fetchAvailableCoupons, bumpCouponUsage, type Coupon } from "@/lib/coupons";
import { addOrder, saveOrderToCloud, type Order } from "@/lib/orders";
import { loadRazorpay, openRazorpay } from "@/lib/razorpay-client";
import { createRazorpayOrder, verifyRazorpayPayment } from "@/lib/razorpay.functions";
import { useCurrentLocationLabel } from "@/lib/location";
import { LocationCard } from "@/components/LocationCard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/cart")({
  head: () => ({ meta: [{ title: "Your Cart – QuickBite" }] }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const navigate = useNavigate();
  const [paying, setPaying] = useState(false);
  const [mockOpen, setMockOpen] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; freeDelivery: boolean } | null>(null);
  const [available, setAvailable] = useState<Coupon[]>([]);
  const loc = useCurrentLocationLabel();
  const { address: locAddress, label: locLabel } = loc;
  const activeRid = items[0]?.restaurantId ?? null;


  useEffect(() => {
    fetchAvailableCoupons(activeRid).then(setAvailable).catch(() => {});
  }, [activeRid]);

  const baseDelivery = items.length ? 30 : 0;
  const deliveryFee = applied?.freeDelivery ? 0 : baseDelivery;
  const discount = applied?.discount ?? 0;
  const grand = Math.max(0, total + deliveryFee - discount);

  async function applyCoupon(input?: string) {
    const c = await findCoupon(input ?? code, activeRid);
    if (!c) return toast.error("Invalid coupon code");
    if (c.minOrder && total < c.minOrder) {
      return toast.error(`Add ₹${c.minOrder - total} more to use ${c.code}`);
    }
    const result = c.apply(total, baseDelivery);
    if (result.discount === 0 && !result.freeDelivery) return toast.error("Coupon not applicable");
    setApplied({ code: c.code, discount: result.discount, freeDelivery: result.freeDelivery });
    setCode(c.code);
    toast.success(`${c.code} applied`);
  }

  function removeCoupon() {
    setApplied(null);
    setCode("");
  }

  async function finalizeOrder(
    paymentLabel: string,
    isCod: boolean,
    rzp?: { orderId: string; paymentId: string },
  ) {
    const txnId = rzp?.paymentId ?? "QB" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const order: Order = {
      id: txnId,
      items,
      subtotal: total,
      deliveryFee,
      discount,
      total: grand,
      placedAt: Date.now(),
      paymentMethod: paymentLabel,
      paymentStatus: isCod ? "pending" : "paid",
      transactionId: isCod ? null : txnId,
      razorpayOrderId: rzp?.orderId,
      razorpayPaymentId: rzp?.paymentId,
      couponCode: applied?.code,
      restaurantName: items[0]?.restaurantName,
      status: "preparing",
    };

    // Cloud sync first (get real UUID if signed in), fallback to local id.
    const cloud = await saveOrderToCloud(order);
    const finalOrder = cloud ?? order;

    try {
      addOrder(finalOrder);
      localStorage.setItem("quickbite_active_order", JSON.stringify(finalOrder));
    } catch {}

    if (applied?.code) bumpCouponUsage(applied.code).catch(() => {});

    clear();
    setPaying(false);
    toast.success(isCod ? "Order placed! Pay cash on delivery." : `Payment successful via ${paymentLabel}`);
    navigate({ to: "/track" });
  }

  async function payOnline() {
    if (!items.length) return;
    setPaying(true);
    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) {
        toast.error("Please sign in to pay online");
        setPaying(false);
        navigate({ to: "/" });
        return;
      }

      // 1) Try to create a real Razorpay order server-side
      let orderInfo: { orderId: string; amount: number; currency: string; keyId: string };
      try {
        orderInfo = await createRazorpayOrder({
          data: { amount: grand, receipt: `qb_${Date.now()}` },
        });
      } catch (e: any) {
        // Fallback to demo checkout when keys are missing/invalid
        const msg = String(e?.message || "");
        if (msg.includes("Authentication failed") || msg.includes("not configured") || msg.includes("BAD_REQUEST_ERROR")) {
          console.warn("Razorpay keys invalid — using demo checkout", msg);
          setPaying(false);
          setMockOpen(true);
          return;
        }
        throw e;
      }

      // 2) Load Razorpay Checkout.js
      await loadRazorpay();

      const meta = (userData.user.user_metadata ?? {}) as Record<string, string>;
      const displayName = meta.full_name || meta.name || (userData.user.email?.split("@")[0] ?? "Customer");

      // 3) Open the real Razorpay modal
      const resp = await openRazorpay({
        keyId: orderInfo.keyId,
        orderId: orderInfo.orderId,
        amount: orderInfo.amount,
        currency: orderInfo.currency,
        name: "QuickBite",
        description: `${items.length} item${items.length > 1 ? "s" : ""} · ₹${grand}`,
        prefill: {
          name: displayName,
          email: userData.user.email ?? undefined,
        },
        themeColor: "#8b5cf6",
      });

      // 4) Verify signature server-side
      const { ok } = await verifyRazorpayPayment({
        data: {
          orderId: resp.razorpay_order_id,
          paymentId: resp.razorpay_payment_id,
          signature: resp.razorpay_signature,
        },
      });
      if (!ok) {
        toast.error("Payment verification failed. Please contact support.");
        setPaying(false);
        return;
      }

      const label = resp.method ? `Razorpay (${resp.method.toUpperCase()})` : "Razorpay";
      await finalizeOrder(label, false, {
        orderId: resp.razorpay_order_id,
        paymentId: resp.razorpay_payment_id,
      });
    } catch (e: any) {
      setPaying(false);
      if (e?.message !== "Payment cancelled") {
        toast.error(e?.message || "Payment failed");
      }
    }
  }

  function onMockSuccess(method: RzpMethod, meta: Record<string, string>) {
    setMockOpen(false);
    const label =
      method === "upi" ? `UPI (${meta.upiId ?? ""})` :
      method === "card" ? `Card (•••• ${(meta.cardNum ?? "").slice(-4)})` :
      method === "netbanking" ? `Netbanking (${meta.bank ?? ""})` :
      method === "wallet" ? `Wallet (${meta.wallet ?? ""})` :
      `Pay Later (${meta.paylater ?? ""})`;
    const paymentId = "pay_demo_" + Math.random().toString(36).slice(2, 12);
    const orderId = "order_demo_" + Math.random().toString(36).slice(2, 12);
    finalizeOrder(label, false, { orderId, paymentId });
  }


  function payCod() {
    if (!items.length) return;
    finalizeOrder("Cash on Delivery", true);
  }

  return (
    <MobileShell>
      <div className="px-5 pt-8">
        <div className="flex items-center gap-3">
          <Link to="/home" className="w-10 h-10 rounded-full bg-white shadow flex items-center justify-center">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <h1 className="text-xl font-black text-slate-900">Your Cart</h1>
        </div>

        {items.length === 0 ? (
          <div className="mt-20 flex flex-col items-center text-center">
            <div className="w-24 h-24 rounded-3xl bg-gradient-to-br from-violet-200 to-pink-200 flex items-center justify-center">
              <ShoppingBag className="w-12 h-12 text-white" />
            </div>
            <p className="mt-4 font-semibold text-slate-800">Your cart is empty</p>
            <p className="text-sm text-slate-500">Add some delicious dishes to get started.</p>
            <Link
              to="/home"
              className="mt-6 px-6 h-12 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-semibold flex items-center shadow-md shadow-pink-200"
            >
              Browse restaurants
            </Link>
          </div>
        ) : (
          <>
            <div className="mt-5 space-y-3">
              {items.map((i) => (
                <div key={i.id} className="bg-white/90 rounded-2xl p-3 shadow-sm flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 shrink-0">
                    {i.image ? (
                      <img src={i.image} alt={i.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-2xl">{i.emoji}</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{i.name}</p>
                    <p className="text-[11px] text-slate-500 truncate">{i.restaurantName}</p>
                    <p className="text-sm font-bold text-violet-600">₹{i.price * i.qty}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <button onClick={() => remove(i.id)} className="text-slate-400 hover:text-rose-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                    <div className="flex items-center gap-2 bg-slate-100 rounded-full px-1">
                      <button onClick={() => setQty(i.id, i.qty - 1)} className="w-6 h-6 flex items-center justify-center">
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="text-xs font-bold w-4 text-center">{i.qty}</span>
                      <button onClick={() => setQty(i.id, i.qty + 1)} className="w-6 h-6 flex items-center justify-center">
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <LocationCard loc={loc} className="mt-5" />

            <div className="mt-5 bg-white/90 rounded-2xl p-4 shadow-sm">

              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-violet-600" />
                <p className="text-sm font-bold text-slate-800">Promo code</p>
              </div>
              {applied ? (
                <div className="mt-2 flex items-center justify-between bg-emerald-50 border border-emerald-200 rounded-xl p-2">
                  <div>
                    <p className="text-sm font-bold text-emerald-700">{applied.code} applied</p>
                    <p className="text-[11px] text-emerald-600">
                      You saved ₹{(applied.discount + (applied.freeDelivery ? baseDelivery : 0))}
                    </p>
                  </div>
                  <button onClick={removeCoupon} className="text-emerald-700">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <>
                  <div className="mt-2 flex gap-2">
                    <input
                      value={code}
                      onChange={(e) => setCode(e.target.value.toUpperCase())}
                      placeholder="Enter code"
                      className="flex-1 h-10 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                    />
                    <button
                      onClick={() => applyCoupon()}
                      className="px-4 h-10 rounded-xl bg-violet-500 text-white text-sm font-semibold"
                    >
                      Apply
                    </button>
                  </div>
                  <div className="mt-3 space-y-1">
                    {available.map((c: Coupon) => (
                      <button
                        key={c.code}
                        onClick={() => applyCoupon(c.code)}
                        className="w-full flex items-center justify-between text-left p-2 rounded-lg hover:bg-violet-50"
                      >
                        <div>
                          <p className="text-xs font-bold text-violet-700">{c.code}</p>
                          <p className="text-[10px] text-slate-500">{c.description}</p>
                        </div>
                        <span className="text-[10px] text-violet-600 font-semibold">Apply</span>
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="mt-5 bg-white/90 rounded-2xl p-4 shadow-sm space-y-2 text-sm">
              <Row label="Subtotal" value={`₹${total}`} />
              <Row label="Delivery" value={deliveryFee === 0 && baseDelivery > 0 ? "FREE" : `₹${deliveryFee}`} />
              {discount > 0 && <Row label={`Discount (${applied?.code})`} value={`-₹${discount}`} accent />}
              <div className="h-px bg-slate-200 my-1" />
              <Row label="Total" value={`₹${grand}`} bold />
            </div>

            <button
              onClick={payOnline}
              disabled={paying}
              className="mt-5 w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-lg shadow-pink-200 active:scale-[0.98] transition disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {paying ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Opening Razorpay…
                </>
              ) : (
                <>Pay ₹{grand} online</>
              )}
            </button>
            <p className="mt-1 text-center text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Secure payment powered by Razorpay
            </p>
            <button
              onClick={payCod}
              disabled={paying}
              className="mt-2 w-full h-12 rounded-2xl bg-white border-2 border-slate-200 text-slate-800 font-semibold flex items-center justify-center gap-2 active:scale-[0.98] transition disabled:opacity-60"
            >
              <Banknote className="w-4 h-4 text-emerald-600" />
              Cash on Delivery
            </button>
          </>
        )}
      </div>
      <RazorpayCheckout
        open={mockOpen}
        amount={grand}
        onClose={() => setMockOpen(false)}
        onSuccess={onMockSuccess}
      />
    </MobileShell>
  );
}

function Row({ label, value, bold, accent }: { label: string; value: string; bold?: boolean; accent?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-slate-900" : accent ? "text-emerald-600 font-semibold" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
