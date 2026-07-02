import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag, Banknote, Tag, X } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { RazorpayCheckout, type RzpMethod } from "@/components/RazorpayCheckout";
import { useCart } from "@/lib/cart";
import { findCoupon, COUPONS } from "@/lib/coupons";
import { addOrder, type Order } from "@/lib/orders";
import { toast } from "sonner";


export const Route = createFileRoute("/cart")({
  head: () => ({
    meta: [{ title: "Your Cart – QuickBite" }],
  }),
  component: CartPage,
});


function CartPage() {
  const { items, setQty, remove, total, clear } = useCart();
  const navigate = useNavigate();
  const [payOpen, setPayOpen] = useState(false);
  const [paying, setPaying] = useState(false);
  const [code, setCode] = useState("");
  const [applied, setApplied] = useState<{ code: string; discount: number; freeDelivery: boolean } | null>(null);

  const userPhone = (() => {
    try {
      const u = JSON.parse(localStorage.getItem("quickbite_user") || "null");
      return u?.phone as string | undefined;
    } catch { return undefined; }
  })();

  const baseDelivery = items.length ? 30 : 0;
  const deliveryFee = applied?.freeDelivery ? 0 : baseDelivery;

  const discount = applied?.discount ?? 0;
  const grand = Math.max(0, total + deliveryFee - discount);

  function applyCoupon(input?: string) {
    const c = findCoupon(input ?? code);
    if (!c) {
      toast.error("Invalid coupon code");
      return;
    }
    if (c.minOrder && total < c.minOrder) {
      toast.error(`Add ₹${c.minOrder - total} more to use ${c.code}`);
      return;
    }
    const result = c.apply(total, baseDelivery);
    if (result.discount === 0 && !result.freeDelivery) {
      toast.error("Coupon not applicable");
      return;
    }
    setApplied({ code: c.code, discount: result.discount, freeDelivery: result.freeDelivery });
    setCode(c.code);
    toast.success(`${c.code} applied`);
  }

  function removeCoupon() {
    setApplied(null);
    setCode("");
  }

  function openPayment() {
    if (!items.length) return;
    setPayOpen(true);
  }

  function finalizeOrder(paymentLabel: string, isCod: boolean, txnMeta?: Record<string, string>) {
    setPaying(true);
    const txnId = "QB" + Math.random().toString(36).slice(2, 10).toUpperCase();
    const order: Order = {
      id: txnId,
      items,
      subtotal: total,
      deliveryFee,
      discount,
      total: grand,
      placedAt: Date.now(),
      paymentMethod: paymentLabel + (txnMeta?.upiId ? ` (${txnMeta.upiId})` : txnMeta?.card ? ` (${txnMeta.card})` : txnMeta?.bank ? ` (${txnMeta.bank})` : txnMeta?.wallet ? ` (${txnMeta.wallet})` : txnMeta?.provider ? ` (${txnMeta.provider})` : ""),
      paymentStatus: isCod ? "pending" : "paid",
      transactionId: isCod ? null : txnId,
      couponCode: applied?.code,
      restaurantName: items[0]?.restaurantName,
      status: "preparing",
    };
    try {
      addOrder(order);
      localStorage.setItem("quickbite_active_order", JSON.stringify(order));
    } catch {}
    clear();
    setPaying(false);
    setPayOpen(false);
    toast.success(isCod ? "Order placed! Pay cash on delivery." : `Payment successful via ${paymentLabel}`);
    navigate({ to: "/track" });
  }

  function payCod() {
    if (!items.length) return;
    finalizeOrder("Cash on Delivery", true);
  }

  const methodLabels: Record<RzpMethod, string> = {
    upi: "UPI",
    card: "Card",
    netbanking: "Netbanking",
    wallet: "Wallet",
    paylater: "Pay Later",
  };


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

            {/* Coupon section */}
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
                    {COUPONS.map((c) => (
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
              onClick={openPayment}
              disabled={paying}
              className="mt-5 w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-lg shadow-pink-200 active:scale-[0.98] transition disabled:opacity-60"
            >
              Pay ₹{grand} online
            </button>
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
        open={payOpen}
        amount={grand}
        phone={userPhone}
        merchantName="QuickBite"
        onClose={() => !paying && setPayOpen(false)}
        onSuccess={(m, meta) => finalizeOrder(methodLabels[m], false, meta)}
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
