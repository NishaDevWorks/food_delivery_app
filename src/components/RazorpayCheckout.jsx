import { useEffect, useState } from "react";
import { X, Smartphone, CreditCard, Building2, Wallet, Clock, Sparkles, Check, ShieldCheck } from "lucide-react";
const TABS = [
    { id: "recommended", label: "Recommended", Icon: Sparkles, badges: [] },
    { id: "upi", label: "UPI", Icon: Smartphone, badges: ["gpay", "phonepe", "paytm"] },
    { id: "card", label: "Cards", Icon: CreditCard, badges: ["visa", "mc", "rupay"] },
    { id: "netbanking", label: "Netbanking", Icon: Building2, badges: ["hdfc", "icici", "sbi"] },
    { id: "wallet", label: "Wallet", Icon: Wallet, badges: ["paytm", "amzn"] },
    { id: "paylater", label: "Pay Later", Icon: Clock, badges: ["lazypay", "simpl"] },
];
const BANKS = ["HDFC Bank", "ICICI Bank", "State Bank of India", "Axis Bank", "Kotak Mahindra"];
const WALLETS = ["Paytm", "Amazon Pay", "Mobikwik", "Freecharge"];
const PAYLATERS = ["LazyPay", "Simpl", "ICICI PayLater"];
export function RazorpayCheckout({ open, amount, phone, merchantName = "QuickBite", onClose, onSuccess }) {
    const [tab, setTab] = useState("recommended");
    const [processing, setProcessing] = useState(false);
    // fields
    const [upiId, setUpiId] = useState("");
    const [cardNum, setCardNum] = useState("");
    const [cardExp, setCardExp] = useState("");
    const [cardCvv, setCardCvv] = useState("");
    const [cardName, setCardName] = useState("");
    const [bank, setBank] = useState(BANKS[0]);
    const [wallet, setWallet] = useState(WALLETS[0]);
    const [paylater, setPaylater] = useState(PAYLATERS[0]);
    const [walletPhone, setWalletPhone] = useState(phone ?? "");
    const [error, setError] = useState(null);
    useEffect(() => {
        if (open) {
            setTab("recommended");
            setError(null);
            setProcessing(false);
        }
    }, [open]);
    useEffect(() => {
        if (!open)
            return;
        const onKey = (e) => e.key === "Escape" && !processing && onClose();
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [open, processing, onClose]);
    if (!open)
        return null;
    const activeMethod = tab === "recommended" ? "upi" : tab;
    function validate() {
        if (activeMethod === "upi") {
            if (!/^[\w.\-]{2,}@[a-zA-Z]{2,}$/.test(upiId.trim()))
                return "Enter a valid UPI ID (e.g. name@upi)";
        }
        else if (activeMethod === "card") {
            const n = cardNum.replace(/\s/g, "");
            if (!/^\d{16}$/.test(n))
                return "Card number must be 16 digits";
            if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(cardExp))
                return "Expiry must be MM/YY";
            if (!/^\d{3,4}$/.test(cardCvv))
                return "CVV must be 3-4 digits";
            if (cardName.trim().length < 2)
                return "Enter cardholder name";
        }
        else if (activeMethod === "wallet") {
            if (!/^\d{10}$/.test(walletPhone))
                return "Enter a valid 10-digit mobile number";
        }
        return null;
    }
    function pay() {
        const err = validate();
        if (err) {
            setError(err);
            return;
        }
        setError(null);
        setProcessing(true);
        const meta = {};
        if (activeMethod === "upi")
            meta.upiId = upiId;
        if (activeMethod === "card")
            meta.card = "•••• " + cardNum.replace(/\s/g, "").slice(-4);
        if (activeMethod === "netbanking")
            meta.bank = bank;
        if (activeMethod === "wallet")
            meta.wallet = wallet;
        if (activeMethod === "paylater")
            meta.provider = paylater;
        setTimeout(() => {
            setProcessing(false);
            onSuccess(activeMethod, meta);
        }, 1600);
    }
    const maskedPhone = phone ? phone.replace(/(\d{2})\d{6}(\d{2})/, "$1••••••$2") : "+91 ••••••••";
    return (<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/70 backdrop-blur-sm p-3 animate-in fade-in">
      <div className="w-full max-w-[860px] max-h-[92vh] rounded-2xl overflow-hidden shadow-2xl bg-white flex flex-col md:flex-row relative">
        {/* Close */}
        <button onClick={() => !processing && onClose()} className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-white/90 hover:bg-white flex items-center justify-center shadow" aria-label="Close">
          <X className="w-4 h-4 text-slate-700"/>
        </button>

        {/* Left brand panel */}
        <aside className="md:w-[260px] w-full bg-gradient-to-b from-[#0b3fb8] to-[#0a2b8a] text-white p-5 flex flex-col relative overflow-hidden">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-md bg-white text-[#0b3fb8] font-black flex items-center justify-center text-sm">
              {merchantName.charAt(0)}
            </div>
            <p className="font-bold text-sm">{merchantName}</p>
          </div>

          <div className="mt-5 bg-white/10 rounded-xl p-3 backdrop-blur-sm">
            <p className="text-[11px] text-white/70">Price Summary</p>
            <p className="text-2xl font-black mt-0.5">₹{amount.toLocaleString("en-IN")}</p>
          </div>

          <div className="mt-3 bg-white/10 rounded-xl p-3 text-[12px] flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center text-[10px] font-bold">👤</div>
            <span className="truncate">Using as {maskedPhone}</span>
          </div>

          <div className="mt-auto pt-6 hidden md:block">
            <div className="text-[10px] text-white/70 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3"/> Secured by
              <span className="font-bold text-white ml-1">Razorpay</span>
            </div>
          </div>
        </aside>

        {/* Middle tab column */}
        <nav className="md:w-[180px] w-full border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50 md:py-4 flex md:flex-col overflow-x-auto">
          {TABS.map(({ id, label, Icon }) => {
            const active = tab === id;
            return (<button key={id} onClick={() => { setTab(id); setError(null); }} className={`shrink-0 md:w-full flex items-center gap-2.5 px-4 py-3 text-left text-sm border-l-[3px] transition ${active
                    ? "bg-white border-[#0b3fb8] text-[#0b3fb8] font-semibold"
                    : "border-transparent text-slate-600 hover:bg-white/60"}`}>
                <Icon className={`w-4 h-4 ${active ? "text-[#0b3fb8]" : "text-slate-500"}`}/>
                <span className="whitespace-nowrap">{label}</span>
              </button>);
        })}
        </nav>

        {/* Right form */}
        <section className="flex-1 p-5 overflow-y-auto min-h-[360px]">
          <h3 className="text-base font-bold text-slate-900">
            {tab === "recommended" ? "Recommended · UPI" :
            tab === "upi" ? "Pay via UPI" :
                tab === "card" ? "Add a new card" :
                    tab === "netbanking" ? "Select your bank" :
                        tab === "wallet" ? "Choose wallet" : "Pay Later"}
          </h3>
          <p className="text-[11px] text-slate-500 mt-0.5">Amount payable ₹{amount.toLocaleString("en-IN")}</p>

          <div className="mt-4 space-y-3">
            {activeMethod === "upi" && (<>
                <label className="text-xs font-semibold text-slate-700">Enter UPI ID</label>
                <input value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0b3fb8] focus:ring-2 focus:ring-[#0b3fb8]/20"/>
                <div className="flex gap-2 pt-1">
                  {["success@upi", "test@ybl", "demo@okhdfc"].map((s) => (<button key={s} onClick={() => setUpiId(s)} className="text-[11px] px-2 py-1 rounded bg-slate-100 text-slate-600 hover:bg-slate-200">
                      {s}
                    </button>))}
                </div>
              </>)}

            {activeMethod === "card" && (<>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Card number</label>
                  <input value={cardNum} onChange={(e) => setCardNum(e.target.value.replace(/\D/g, "").slice(0, 16).replace(/(\d{4})(?=\d)/g, "$1 "))} placeholder="1111 1111 1111 1111" inputMode="numeric" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0b3fb8] focus:ring-2 focus:ring-[#0b3fb8]/20"/>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-slate-700">Expiry</label>
                    <input value={cardExp} onChange={(e) => {
                let v = e.target.value.replace(/\D/g, "").slice(0, 4);
                if (v.length >= 3)
                    v = v.slice(0, 2) + "/" + v.slice(2);
                setCardExp(v);
            }} placeholder="MM/YY" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0b3fb8] focus:ring-2 focus:ring-[#0b3fb8]/20"/>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-700">CVV</label>
                    <input value={cardCvv} onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="•••" type="password" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0b3fb8] focus:ring-2 focus:ring-[#0b3fb8]/20"/>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Cardholder name</label>
                  <input value={cardName} onChange={(e) => setCardName(e.target.value)} placeholder="John Doe" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0b3fb8] focus:ring-2 focus:ring-[#0b3fb8]/20"/>
                </div>
              </>)}

            {activeMethod === "netbanking" && (<div className="space-y-2">
                {BANKS.map((b) => (<button key={b} onClick={() => setBank(b)} className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm text-left transition ${bank === b ? "border-[#0b3fb8] bg-[#0b3fb8]/5 text-[#0b3fb8] font-semibold" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                    <span className="flex items-center gap-2"><Building2 className="w-4 h-4"/> {b}</span>
                    {bank === b && <Check className="w-4 h-4"/>}
                  </button>))}
              </div>)}

            {activeMethod === "wallet" && (<>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Wallet</label>
                  <select value={wallet} onChange={(e) => setWallet(e.target.value)} className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm bg-white focus:outline-none focus:border-[#0b3fb8]">
                    {WALLETS.map((w) => <option key={w}>{w}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Mobile number</label>
                  <input value={walletPhone} onChange={(e) => setWalletPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} placeholder="10-digit mobile number" inputMode="numeric" className="w-full h-11 px-3 rounded-lg border border-slate-300 text-sm focus:outline-none focus:border-[#0b3fb8] focus:ring-2 focus:ring-[#0b3fb8]/20"/>
                </div>
              </>)}

            {activeMethod === "paylater" && (<div className="space-y-2">
                {PAYLATERS.map((p) => (<button key={p} onClick={() => setPaylater(p)} className={`w-full flex items-center justify-between p-3 rounded-lg border text-sm text-left transition ${paylater === p ? "border-[#0b3fb8] bg-[#0b3fb8]/5 text-[#0b3fb8] font-semibold" : "border-slate-200 hover:bg-slate-50 text-slate-700"}`}>
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4"/> {p}</span>
                    {paylater === p && <Check className="w-4 h-4"/>}
                  </button>))}
              </div>)}

            {error && (<p className="text-xs font-semibold text-rose-600 bg-rose-50 border border-rose-200 rounded-lg p-2">{error}</p>)}

            <button onClick={pay} disabled={processing} className="w-full h-12 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-sm mt-2 disabled:opacity-70 flex items-center justify-center gap-2">
              {processing ? (<>
                  <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"/>
                  Processing…
                </>) : (`Pay ₹${amount.toLocaleString("en-IN")}`)}
            </button>

            <p className="text-[10px] text-slate-400 text-center pt-1">
              🔒 Demo checkout — mimics Razorpay UI. No real charge is made.
            </p>
          </div>
        </section>
      </div>
    </div>);
}
