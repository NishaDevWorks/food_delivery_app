import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Mail, Phone, MessageCircle } from "lucide-react";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
export const Route = createFileRoute("/help")({
    head: () => ({ meta: [{ title: "Help & support – QuickBite" }] }),
    component: HelpPage,
});
const faqs = [
    { q: "How do I track my order?", a: "Open the order from cart and tap 'Track' to see live status on the map." },
    { q: "What payment methods are supported?", a: "UPI, Cards, Wallets and Cash on Delivery via Razorpay." },
    { q: "How do I cancel an order?", a: "Orders can be cancelled within 2 minutes of placing from the track screen." },
    { q: "Is there a delivery fee?", a: "A flat ₹30 delivery fee applies. Free above ₹499." },
];
function HelpPage() {
    const [open, setOpen] = useState(0);
    return (<MobileShell>
      <div className="px-5 pt-6 pb-8">
        <div className="flex items-center gap-3">
          <Link to="/profile" className="w-10 h-10 rounded-full bg-white/80 flex items-center justify-center shadow">
            <ArrowLeft className="w-5 h-5 text-slate-700"/>
          </Link>
          <h1 className="text-xl font-black text-slate-900">Help & support</h1>
        </div>

        <div className="mt-5 grid grid-cols-3 gap-3">
          <a href="tel:+911800000000" className="bg-white/90 rounded-2xl p-3 text-center shadow-sm">
            <Phone className="w-5 h-5 mx-auto text-violet-600"/>
            <p className="mt-1 text-xs font-semibold text-slate-700">Call</p>
          </a>
          <a href="mailto:help@quickbite.app" className="bg-white/90 rounded-2xl p-3 text-center shadow-sm">
            <Mail className="w-5 h-5 mx-auto text-violet-600"/>
            <p className="mt-1 text-xs font-semibold text-slate-700">Email</p>
          </a>
          <a href="https://wa.me/911800000000" className="bg-white/90 rounded-2xl p-3 text-center shadow-sm">
            <MessageCircle className="w-5 h-5 mx-auto text-violet-600"/>
            <p className="mt-1 text-xs font-semibold text-slate-700">Chat</p>
          </a>
        </div>

        <h2 className="mt-6 font-bold text-slate-800">FAQs</h2>
        <div className="mt-3 bg-white/90 rounded-3xl shadow-sm divide-y divide-slate-100">
          {faqs.map((f, i) => (<button key={i} onClick={() => setOpen(open === i ? null : i)} className="w-full p-4 text-left">
              <p className="text-sm font-semibold text-slate-800">{f.q}</p>
              {open === i && <p className="mt-1 text-xs text-slate-500">{f.a}</p>}
            </button>))}
        </div>
      </div>
    </MobileShell>);
}
