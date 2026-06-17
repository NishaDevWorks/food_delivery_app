import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeft, Minus, Plus, Trash2, ShoppingBag } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { useCart } from "@/lib/cart";
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
  const deliveryFee = items.length ? 30 : 0;
  const grand = total + deliveryFee;

  function placeOrder() {
    if (!items.length) return;
    try {
      localStorage.setItem(
        "quickbite_active_order",
        JSON.stringify({
          items,
          total: grand,
          placedAt: Date.now(),
        }),
      );
    } catch {}
    clear();
    toast.success("Order placed! Tracking your courier…");
    navigate({ to: "/track" });
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
                  <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center text-2xl">
                    {i.emoji}
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

            <div className="mt-6 bg-white/90 rounded-2xl p-4 shadow-sm space-y-2 text-sm">
              <Row label="Subtotal" value={`₹${total}`} />
              <Row label="Delivery" value={`₹${deliveryFee}`} />
              <div className="h-px bg-slate-200 my-1" />
              <Row label="Total" value={`₹${grand}`} bold />
            </div>

            <button
              onClick={placeOrder}
              className="mt-5 w-full h-14 rounded-2xl bg-gradient-to-r from-violet-500 to-pink-500 text-white font-bold shadow-lg shadow-pink-200 active:scale-[0.98] transition"
            >
              Place order · ₹{grand}
            </button>
          </>
        )}
      </div>
    </MobileShell>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`flex justify-between ${bold ? "font-bold text-slate-900" : "text-slate-600"}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}
