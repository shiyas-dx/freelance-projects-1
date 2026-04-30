import { useState, useEffect, useCallback, useRef } from "react";
import {
  MessageCircle, Send, CheckCheck, Phone, Package,
  MapPin, User, Clock, ArrowRight, Loader2, RefreshCw,
  Search, BadgeCheck, XCircle, Settings2, CheckCircle,
  AlertTriangle, ChevronRight, Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import toast from "react-hot-toast";

const FROM_KEY = "admin_wa_from_number";

/* ── helpers ───────────────────────────────────────────── */
const fmt = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

const fmtTime = (iso) =>
  new Date(iso).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

function cleanPhone(raw = "") {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "91" + d.slice(1);
  if (d.length === 10)   return "91" + d;
  return d;
}

function buildConfirmMsg(order, fromNumber = "") {
  const base   = window.location.origin;
  const cnf    = `${base}/order/confirm/${order.confirmation_token}/confirm/`;
  const cnl    = `${base}/order/confirm/${order.confirmation_token}/cancel/`;

  const items = (order.items || []).map((it) => {
    const name  = it.product?.name || it.product_name || `Item #${it.id}`;
    const qty   = it.quantity || 1;
    const price = parseFloat(it.price_at_purchase || it.product?.price || 0);
    return `  • ${name} × ${qty}  →  ₹${(price * qty).toFixed(2)}`;
  }).join("\n");

  const addr = [order.address, order.city, order.zip ? `PIN: ${order.zip}` : ""].filter(Boolean).join(", ");

  const lines = [
    `Hello ${order.name || "Customer"} 👋`,
    "",
    `Your order *#${order.id}* is placed and awaiting your confirmation.`,
    "",
    "*ORDER SUMMARY:*",
    items || "  (no items)",
    "",
    `*TOTAL: ₹${order.total_price}*`,
    "",
    "*DELIVERY ADDRESS:*",
    addr,
    "",
    "Please confirm or cancel your order below:",
    `✅ *CONFIRM:* ${cnf}`,
    `❌ *CANCEL:*  ${cnl}`,
  ];
  if (fromNumber) lines.push("", `📞 Contact us: ${fromNumber}`);
  return encodeURIComponent(lines.join("\n"));
}

/* ── OrderCard (queue item) ────────────────────────────── */
function OrderCard({ order, onConfirm, onCancel, fromNumber }) {
  const [waSent,     setWaSent]     = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [expanded,   setExpanded]   = useState(false);

  const toNum  = order.phone ? cleanPhone(order.phone) : "";
  const waLink = toNum
    ? `https://wa.me/${toNum}?text=${buildConfirmMsg(order, fromNumber)}`
    : null;

  const waitMs   = new Date() - new Date(order.created_at);
  const waitMins = Math.floor(waitMs / 60000);
  const urgent   = waitMins > 30;

  const doConfirm = async () => {
    setConfirming(true);
    await onConfirm(order.id);
    setConfirming(false);
  };
  const doCancel = async () => {
    setCancelling(true);
    await onCancel(order.id);
    setCancelling(false);
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.22 }}
      className={`bg-white rounded-3xl border shadow-sm overflow-hidden
        ${urgent ? "border-amber-200" : "border-gray-100"}`}
    >
      {/* Top stripe — urgent indicator */}
      {urgent && (
        <div className="h-1 bg-gradient-to-r from-amber-400 to-orange-500 w-full" />
      )}

      {/* Card header */}
      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
              {order.name?.charAt(0)?.toUpperCase()}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-black text-gray-900 text-sm">#{order.id}</span>
                <span className="font-black text-gray-700 text-sm truncate">{order.name}</span>
              </div>
              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                <span className="text-[10px] text-gray-400 font-bold">
                  {fmt(order.created_at)} · {fmtTime(order.created_at)}
                </span>
                {urgent && (
                  <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                    <AlertTriangle size={8} /> {waitMins}m waiting
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="font-black text-lg text-gray-900">₹{order.total_price}</span>
            <button
              onClick={() => setExpanded((v) => !v)}
              className="w-8 h-8 rounded-xl bg-gray-50 flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
            >
              <ChevronRight size={14} className={`transition-transform ${expanded ? "rotate-90" : ""}`} />
            </button>
          </div>
        </div>

        {/* Quick info row */}
        <div className="flex items-center gap-4 mt-3 flex-wrap">
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold">
            <MapPin size={11} className="text-gray-400" />
            {order.city}
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold">
            <Package size={11} className="text-gray-400" />
            {order.items?.length || 0} item{(order.items?.length || 0) !== 1 ? "s" : ""}
          </div>
          {order.phone && (
            <div className="flex items-center gap-1.5 text-[11px] text-gray-500 font-bold">
              <Phone size={11} className="text-gray-400" />
              {order.phone}
            </div>
          )}
        </div>
      </div>

      {/* Expanded items */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-5 pb-4 space-y-2 border-t border-gray-50 pt-4">
              <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-2">Items</p>
              {(order.items || []).map((item, i) => {
                const name  = item.product?.name || `Item #${i + 1}`;
                const qty   = item.quantity || 1;
                const price = parseFloat(item.price_at_purchase || item.product?.price || 0);
                return (
                  <div key={item.id || i} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                    <span className="text-[12px] font-bold text-gray-700">{name} × {qty}</span>
                    <span className="text-[12px] font-black text-gray-900">₹{(price * qty).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Address</span>
                <span className="text-[11px] font-bold text-gray-600 text-right max-w-[200px]">
                  {order.address}, {order.city}
                </span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* WhatsApp action area */}
      <div className="px-5 pb-5 space-y-3 border-t border-gray-50 pt-4">
        {/* Step 1: Send WA message */}
        <div className="flex items-center gap-2">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0
            ${waSent ? "bg-emerald-500 text-white" : "bg-gray-900 text-white"}`}>
            {waSent ? "✓" : "1"}
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            Send WhatsApp confirmation link
          </span>
        </div>

        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            onClick={() => setWaSent(true)}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all
              ${waSent
                ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                : "bg-[#25D366] text-white hover:bg-[#1ebe5d] active:scale-[0.98] shadow-sm"}`}
          >
            {waSent
              ? <><CheckCheck size={13} /> Link Sent — Customer Notified</>
              : <><Send size={13} /> Send Confirmation Link via WhatsApp</>}
          </a>
        ) : (
          <div className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest">
            <Phone size={13} /> No phone number on order
          </div>
        )}

        {/* Step 2: Admin confirm / cancel */}
        <div className="flex items-center gap-2 mt-1">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0
            ${waSent ? "bg-gray-900 text-white" : "bg-gray-200 text-gray-400"}`}>
            2
          </div>
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
            Confirm or cancel the order
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={doCancel}
            disabled={cancelling || confirming}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl border-2 border-rose-200 text-rose-600 bg-rose-50
              font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 hover:text-white hover:border-rose-600
              transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {cancelling
              ? <Loader2 size={12} className="animate-spin" />
              : <><XCircle size={12} /> Cancel</>}
          </button>
          <button
            onClick={doConfirm}
            disabled={confirming || cancelling}
            className="flex items-center justify-center gap-1.5 py-3 rounded-2xl bg-black text-white
              font-black uppercase tracking-widest text-[10px] hover:bg-orange-600
              transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-lg"
          >
            {confirming
              ? <Loader2 size={12} className="animate-spin" />
              : <><BadgeCheck size={12} /> Confirm</>}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ── FromNumberBar ─────────────────────────────────────── */
function FromNumberBar({ value, onChange }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3 flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-1.5">
        <Settings2 size={13} className="text-orange-500" />
        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Your WhatsApp number</span>
      </div>
      <div className="relative flex-1 min-w-[200px]">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base select-none">🇮🇳</span>
        <input
          type="tel"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="+91 98765 43210"
          className="w-full pl-9 pr-4 py-2 rounded-xl border border-gray-200 bg-gray-50 text-sm font-bold outline-none focus:border-orange-400 focus:bg-white transition"
        />
      </div>
      <p className="text-[9px] text-gray-400 font-bold hidden sm:block">Appended to every message · auto-saved</p>
    </div>
  );
}

/* ══ PAGE ════════════════════════════════════════════════ */
export default function OrderConfirmationQueue() {
  const [orders,    setOrders]    = useState([]);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState("");
  const [fromNumber,setFromNumber]= useState(() => localStorage.getItem(FROM_KEY) || "");

  useEffect(() => {
    if (fromNumber) localStorage.setItem(FROM_KEY, fromNumber);
  }, [fromNumber]);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      const res = await API.get(`admin/orders/confirm-queue/?${params}`);
      setOrders(res.data.results || res.data || []);
    } catch {
      toast.error("Failed to load confirmation queue");
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);
  // Poll every 30s
  useEffect(() => {
    const id = setInterval(fetchQueue, 30_000);
    return () => clearInterval(id);
  }, [fetchQueue]);

  const handleConfirm = async (orderId) => {
    try {
      await API.post(`admin/orders/${orderId}/confirm/`);
      setOrders((p) => p.filter((o) => o.id !== orderId));
      toast.success(`Order #${orderId} confirmed ✓`);
    } catch {
      toast.error("Confirmation failed");
    }
  };

  const handleCancel = async (orderId) => {
    try {
      await API.post(`admin/orders/${orderId}/cancel/`);
      setOrders((p) => p.filter((o) => o.id !== orderId));
      toast.success(`Order #${orderId} cancelled`);
    } catch {
      toast.error("Cancel failed");
    }
  };

  const urgentCount = orders.filter((o) => {
    const mins = Math.floor((new Date() - new Date(o.created_at)) / 60000);
    return mins > 30;
  }).length;

  return (
    <div className="space-y-6 max-w-2xl mx-auto">

      {/* Page header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            Confirm Queue<span className="text-orange-600">.</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
            {orders.length} pending · {urgentCount > 0 && (
              <span className="text-amber-600">{urgentCount} urgent</span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Go to Order Management */}
          <a
            href="/admin/orders"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
          >
            Order Management <ArrowRight size={12} />
          </a>
          <button
            onClick={fetchQueue}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-2xl hover:bg-orange-600 transition shadow-lg text-[10px] font-black uppercase tracking-widest"
          >
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* From number bar */}
      <FromNumberBar value={fromNumber} onChange={setFromNumber} />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
        <input
          type="text"
          placeholder="Search by name or order ID…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 bg-white border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 shadow-sm transition"
        />
      </div>

      {/* How-it-works strip */}
      <div className="flex items-center gap-0 overflow-x-auto">
        {[
          { n: 1, label: "Order arrives", sub: "Appears in queue", color: "bg-gray-900" },
          { n: 2, label: "Send WA link", sub: "Customer confirms", color: "bg-[#25D366]" },
          { n: 3, label: "Admin confirm", sub: "Mark as confirmed", color: "bg-orange-600" },
          { n: 4, label: "Goes to Orders", sub: "Manage shipping", color: "bg-sky-500" },
        ].map((step, i, arr) => (
          <div key={step.n} className="flex items-center flex-shrink-0">
            <div className="flex items-center gap-2 px-3 py-2 rounded-2xl bg-gray-50 border border-gray-100">
              <div className={`w-5 h-5 rounded-full ${step.color} text-white text-[9px] font-black flex items-center justify-center flex-shrink-0`}>
                {step.n}
              </div>
              <div>
                <div className="text-[10px] font-black text-gray-700">{step.label}</div>
                <div className="text-[9px] text-gray-400 font-bold">{step.sub}</div>
              </div>
            </div>
            {i < arr.length - 1 && <ChevronRight size={13} className="text-gray-300 mx-1 flex-shrink-0" />}
          </div>
        ))}
      </div>

      {/* Queue */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="animate-spin text-gray-400" />
          <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Loading queue…</p>
        </div>
      ) : orders.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center justify-center py-24 gap-4 bg-white rounded-3xl border border-gray-100 shadow-sm"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center">
            <CheckCircle size={28} className="text-emerald-400" />
          </div>
          <div className="text-center">
            <p className="font-black text-gray-700 uppercase tracking-tight">Queue is clear!</p>
            <p className="text-gray-400 font-bold text-sm mt-1">All pending orders have been processed.</p>
          </div>
          <a
            href="/admin/orders"
            className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition shadow-lg"
          >
            Go to Order Management <ArrowRight size={12} />
          </a>
        </motion.div>
      ) : (
        <div className="space-y-4">
          <AnimatePresence mode="popLayout">
            {orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                onConfirm={handleConfirm}
                onCancel={handleCancel}
                fromNumber={fromNumber}
              />
            ))}
          </AnimatePresence>

          {/* Footer CTA */}
          <div className="flex items-center justify-center pt-2">
            <a
              href="/admin/orders"
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all"
            >
              <Inbox size={13} /> Manage Confirmed Orders <ArrowRight size={12} />
            </a>
          </div>
        </div>
      )}
    </div>
  );
}