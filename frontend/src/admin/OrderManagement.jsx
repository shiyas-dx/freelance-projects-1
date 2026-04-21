import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight,
  Truck, CheckCircle, XCircle, Clock, MapPin,
  User, Package, AlertTriangle, RefreshCw,
  ChevronDown, ShoppingBag, BarChart3, Trash2,
  ExternalLink, ImageOff, MessageCircle, BadgeCheck,
  ArrowLeft, Phone, CheckCheck,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import toast from "react-hot-toast";

const PER_PAGE = 10;

const STATUS = {
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 border-amber-200 text-amber-700",
    icon: Clock,
    headerBg: "bg-amber-50 border-amber-100",
  },
  "Admin Confirmed": {
    dot: "bg-violet-400",
    pill: "bg-violet-50 border-violet-200 text-violet-700",
    icon: BadgeCheck,
    headerBg: "bg-violet-50 border-violet-100",
  },
  Shipped: {
    dot: "bg-sky-400",
    pill: "bg-sky-50 border-sky-200 text-sky-700",
    icon: Truck,
    headerBg: "bg-sky-50 border-sky-100",
  },
  Delivered: {
    dot: "bg-emerald-400",
    pill: "bg-emerald-50 border-emerald-200 text-emerald-700",
    icon: CheckCircle,
    headerBg: "bg-emerald-50 border-emerald-100",
  },
  Cancelled: {
    dot: "bg-rose-400",
    pill: "bg-rose-50 border-rose-200 text-rose-700",
    icon: XCircle,
    headerBg: "bg-rose-50 border-rose-100",
  },
};

const fmt = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric",
  });

function useDebounce(v, d = 400) {
  const [dv, setDv] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setDv(v), d);
    return () => clearTimeout(id);
  }, [v, d]);
  return dv;
}

/* ══ Build WhatsApp message ══════════════════════════════════════════════════ */
function buildWhatsAppMessage(order) {
  const itemLines = (order.items || [])
    .map((item) => {
      const name = item.product?.name || item.product_name || `Item #${item.id}`;
      const qty  = item.quantity || 1;
      const price = parseFloat(item.price_at_purchase || item.product?.price || 0);
      return `  • ${name} × ${qty}  –  ₹${(price * qty).toFixed(2)}`;
    })
    .join("\n");

  const message = [
    `Hello ${order.name || "there"} 👋`,
    ``,
    `Your order *#${order.id}* has been confirmed! 🎉`,
    ``,
    `*Order Summary:*`,
    itemLines || `  (no items)`,
    ``,
    `*Total:* ₹${order.total_price}`,
    ``,
    `*Delivery Address:*`,
    `${order.address}, ${order.city}`,
    order.zip ? `PIN: ${order.zip}` : "",
    ``,
    `We'll notify you once your order is shipped. Thank you for shopping with us! 🛍️`,
  ]
    .filter((l) => l !== undefined)
    .join("\n");

  return encodeURIComponent(message);
}

/* Strips non-digits and country-prefixes for wa.me */
function cleanPhone(raw = "") {
  const digits = raw.replace(/\D/g, "");
  // If it starts with 0, replace with India's 91
  if (digits.startsWith("0")) return "91" + digits.slice(1);
  // If it already has a country code (>10 digits), keep it
  if (digits.length > 10) return digits;
  return "91" + digits; // default India
}

/* ══ OrderConfirmOverlay ══════════════════════════════════════════════════════
   Full-screen "page" that slides up over everything when admin clicks Confirm.
   Shows order details + WhatsApp button + Confirm / Cancel actions.
═══════════════════════════════════════════════════════════════════════════════*/
function OrderConfirmOverlay({ order, onClose, onConfirm, onCancel }) {
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [cancelLoading,  setCancelLoading]  = useState(false);
  const [waSent,         setWaSent]         = useState(false);

  if (!order) return null;

  const phone   = cleanPhone(order.phone || "");
  const waLink  = `https://wa.me/${phone}?text=${buildWhatsAppMessage(order)}`;

  const handleConfirm = async () => {
    setConfirmLoading(true);
    await onConfirm(order.id);
    setConfirmLoading(false);
    onClose();
  };

  const handleCancel = async () => {
    setCancelLoading(true);
    await onCancel(order.id);
    setCancelLoading(false);
    onClose();
  };

  return (
    <motion.div
      key="confirm-overlay"
      initial={{ opacity: 0, y: "100%" }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: "100%" }}
      transition={{ type: "spring", damping: 32, stiffness: 280 }}
      className="fixed inset-0 z-[100] bg-white flex flex-col overflow-hidden"
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100 bg-white flex-shrink-0">
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition"
        >
          <ArrowLeft size={15} /> Back to Orders
        </button>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
            Order Review
          </span>
          <span className="bg-amber-100 text-amber-700 text-[9px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
            Pending Confirmation
          </span>
        </div>
      </div>

      {/* ── Scrollable body ── */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-6 py-10 space-y-8">

          {/* Hero */}
          <div className="text-center space-y-2">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-4">
              <Package size={28} className="text-amber-500" />
            </div>
            <h1 className="text-4xl font-black uppercase italic tracking-tighter">
              Order <span className="text-orange-600">#{order.id}</span>
            </h1>
            <p className="text-gray-400 font-bold text-sm">{fmt(order.created_at)}</p>
          </div>

          {/* Customer + phone */}
          <div className="bg-gray-50 rounded-3xl p-6 space-y-4">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">Customer</p>
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gray-900 text-white flex items-center justify-center font-black text-lg flex-shrink-0">
                  {order.name?.charAt(0)?.toUpperCase()}
                </div>
                <div>
                  <p className="font-black text-gray-900">{order.name}</p>
                  <p className="text-xs text-gray-400 font-bold mt-0.5">{order.phone || "No phone"}</p>
                </div>
              </div>

              {/* WhatsApp CTA */}
              {order.phone ? (
                <a
                  href={waLink}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setWaSent(true)}
                  className={`flex items-center gap-2 px-5 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all shadow-sm
                    ${waSent
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : "bg-[#25D366] text-white hover:bg-[#1ebe5d] active:scale-95"
                    }`}
                >
                  {waSent ? (
                    <><CheckCheck size={14} /> Message Sent</>
                  ) : (
                    <><MessageCircle size={14} /> WhatsApp Customer</>
                  )}
                </a>
              ) : (
                <div className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gray-100 text-gray-400 font-black uppercase text-[10px] tracking-widest">
                  <Phone size={14} /> No Phone Number
                </div>
              )}
            </div>
          </div>

          {/* Delivery address */}
          <div className="bg-gray-50 rounded-3xl p-6 space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <MapPin size={10} /> Delivery Address
            </p>
            <p className="font-black text-gray-900">{order.city}</p>
            <p className="text-sm text-gray-500 font-bold leading-relaxed">{order.address}</p>
            {order.phone && (
              <p className="text-xs text-gray-400 font-bold">{order.phone}</p>
            )}
          </div>

          {/* Items */}
          <div className="space-y-3">
            <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
              <Package size={10} /> Items · {order.items?.length || 0}
            </p>
            {(order.items || []).length === 0 ? (
              <div className="bg-gray-50 rounded-3xl p-6 text-center">
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No item data</p>
              </div>
            ) : (
              <div className="space-y-2">
                {(order.items || []).map((item, i) => {
                  const product   = item.product || {};
                  const name      = product.name || item.product_name || `Item #${i + 1}`;
                  const unitPrice = parseFloat(item.price_at_purchase || product.price || 0);
                  const qty       = item.quantity || 1;
                  const imgSrc    = product.image || product.image_url || null;

                  return (
                    <div key={item.id || i} className="flex items-center gap-4 bg-gray-50 rounded-2xl p-4">
                      {imgSrc ? (
                        <img src={imgSrc} alt={name}
                          className="w-14 h-14 rounded-xl object-cover flex-shrink-0 bg-gray-100" />
                      ) : (
                        <div className="w-14 h-14 rounded-xl bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <ImageOff size={18} className="text-gray-300" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-900 truncate">{name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-1">
                          Qty × {qty} &nbsp;·&nbsp; ₹{unitPrice.toFixed(2)} each
                        </p>
                      </div>
                      <p className="font-black text-gray-900 flex-shrink-0">
                        ₹{(unitPrice * qty).toFixed(2)}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total */}
          <div className="flex justify-between items-center bg-black text-white rounded-3xl px-6 py-5">
            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Total</p>
            <p className="text-3xl font-black italic tracking-tight">₹{order.total_price}</p>
          </div>

          {/* WhatsApp message preview */}
          <div className="rounded-3xl border border-gray-100 overflow-hidden">
            <div className="bg-[#075e54] px-5 py-3 flex items-center gap-2">
              <MessageCircle size={14} className="text-white/70" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/70">
                WhatsApp Message Preview
              </p>
            </div>
            <div className="bg-[#ece5dd] p-5">
              <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-xs text-sm text-gray-800 font-medium leading-relaxed whitespace-pre-wrap">
                {decodeURIComponent(buildWhatsAppMessage(order))}
              </div>
            </div>
          </div>

          {/* Bottom padding so buttons don't overlap */}
          <div className="h-4" />
        </div>
      </div>

      {/* ── Sticky action bar ── */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-6 py-4">
        <div className="max-w-2xl mx-auto flex gap-3">
          <button
            onClick={handleCancel}
            disabled={cancelLoading || confirmLoading}
            className="flex-1 flex items-center justify-center gap-2 py-4 rounded-2xl border-2 border-rose-200 text-rose-600 bg-rose-50
              font-black uppercase tracking-widest text-[10px] hover:bg-rose-600 hover:text-white hover:border-rose-600
              transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {cancelLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <><XCircle size={14} /> Cancel Order</>
            )}
          </button>

          <button
            onClick={handleConfirm}
            disabled={confirmLoading || cancelLoading}
            className="flex-[2] flex items-center justify-center gap-2 py-4 rounded-2xl bg-black text-white
              font-black uppercase tracking-widest text-[10px] hover:bg-orange-600
              transition-all disabled:opacity-40 disabled:cursor-not-allowed active:scale-[0.98] shadow-xl"
          >
            {confirmLoading ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <><BadgeCheck size={14} /> Confirm Order</>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* ══ StatusPill ══════════════════════════════════════════════════════════════*/
function StatusPill({ status, onChange, disabled }) {
  const [open,   setOpen]   = useState(false);
  const btnRef              = useRef(null);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const cfg = STATUS[status] || STATUS.Pending;

  const handleOpen = () => {
    if (disabled) return;
    const rect = btnRef.current?.getBoundingClientRect();
    if (rect) setCoords({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        disabled={disabled}
        onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
          ${cfg.pill} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
        {status}
        {!disabled && <ChevronDown size={10} className="flex-shrink-0" />}
      </button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-[60]" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -4 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -4 }}
              transition={{ duration: 0.12 }}
              style={{ position: "fixed", top: coords.top, left: coords.left }}
              className="z-[70] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[160px]"
            >
              {Object.entries(STATUS).map(([key, c]) => (
                <button
                  key={key}
                  onClick={() => { onChange(key); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest
                    hover:bg-gray-50 transition-colors
                    ${status === key ? c.pill.split(" ").find((x) => x.startsWith("text-")) || "text-gray-900" : "text-gray-500"}`}
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${c.dot}`} />
                  {key}
                  {status === key && <span className="ml-auto text-[8px] opacity-60">✓</span>}
                </button>
              ))}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

/* ══ ConfirmDialog ══════════════════════════════════════════════════════════*/
function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="cd-bg"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
            onClick={onCancel}
          />
          <motion.div key="cd-box"
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm mx-4"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${danger ? "bg-rose-50" : "bg-amber-50"}`}>
                <AlertTriangle size={20} className={danger ? "text-rose-500" : "text-amber-500"} />
              </div>
              <div>
                <p className="font-black text-gray-900 text-base uppercase tracking-tight">{title}</p>
                <p className="text-gray-400 font-bold text-sm mt-1 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={onConfirm}
                className={`flex-1 py-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition
                  ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-black hover:bg-gray-800"}`}>
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ══ ProductImage ══════════════════════════════════════════════════════════ */
function ProductImage({ src, name, size = 40 }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0"
        style={{ width: size, height: size }}>
        <ImageOff size={size * 0.35} className="text-gray-300" />
      </div>
    );
  }
  return (
    <img src={src} alt={name} onError={() => setErr(true)}
      className="rounded-xl object-cover flex-shrink-0"
      style={{ width: size, height: size }}
    />
  );
}

/* ══ OrderDrawer ══════════════════════════════════════════════════════════ */
function OrderDrawer({ order, onClose, onStatusChange, onDeleteOrder, onOpenConfirm }) {
  const [local,         setLocal]         = useState(order);
  const [fetching,      setFetching]      = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!order) { setLocal(null); return; }
    setLocal(order);
    setFetching(true);
    API.get(`admin/orders/${order.id}/`)
      .then((res) => setLocal(res.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [order?.id]);

  const handleStatusChange = (orderId, newStatus) => {
    setLocal((prev) => prev ? { ...prev, status: newStatus } : prev);
    onStatusChange(orderId, newStatus);
  };

  const handleDelete = () => {
    setDeleteConfirm(false);
    onDeleteOrder(local.id);
    onClose();
  };

  const cfg = local ? STATUS[local.status] || STATUS.Pending : null;

  const computedTotal = local?.items?.length
    ? local.items.reduce((sum, item) => sum + parseFloat(item.price_at_purchase || 0) * (item.quantity || 1), 0).toFixed(2)
    : local?.total_price;

  const isPending = local?.status === "Pending";

  return (
    <>
      <AnimatePresence>
        {local && (
          <>
            <motion.div key="drawer-bg"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40]"
              onClick={onClose}
            />
            <motion.div key="drawer-panel"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-[440px] bg-white z-[50] shadow-2xl flex flex-col"
            >
              {/* Header */}
              <div className={`p-6 border-b ${cfg.headerBg} flex-shrink-0`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">Order Details</p>
                    <div className="flex items-center gap-2">
                      <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">#{local.id}</h2>
                      {fetching && <Loader2 size={14} className="animate-spin text-gray-400" />}
                    </div>
                    <p className="text-sm text-gray-500 mt-1.5">{fmt(local.created_at)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => setDeleteConfirm(true)}
                      className="p-2.5 rounded-xl hover:bg-rose-50 transition-colors text-gray-400 hover:text-rose-500"
                      title="Move to history">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={onClose}
                      className="p-2.5 rounded-xl hover:bg-black/10 transition-colors text-gray-500">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                  <StatusPill status={local.status} onChange={(s) => handleStatusChange(local.id, s)} />

                  {/* Confirm Order shortcut button — only for Pending */}
                  {isPending && (
                    <button
                      onClick={() => { onClose(); onOpenConfirm(local); }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white
                        text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all"
                    >
                      <BadgeCheck size={11} /> Confirm Order
                    </button>
                  )}
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                <section>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                    <User size={10} /> Customer
                  </p>
                  <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                    <div className="w-10 h-10 rounded-2xl bg-gray-900 flex items-center justify-center text-white font-black text-sm flex-shrink-0">
                      {local.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div>
                      <p className="font-black text-sm text-gray-900">{local.name}</p>
                      <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                        {local.user ? `@${local.user.username}` : "Guest checkout"}
                      </p>
                      {local.phone && (
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{local.phone}</p>
                      )}
                    </div>
                  </div>
                </section>

                <section>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                    <MapPin size={10} /> Shipping Address
                  </p>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="font-black text-sm text-gray-900">{local.city}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{local.address}</p>
                    {local.phone && (
                      <p className="text-[10px] text-gray-400 mt-2 font-bold">{local.phone}</p>
                    )}
                  </div>
                </section>

                <section>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                    <Package size={10} /> Items · {local.items?.length || 0}
                  </p>
                  <div className="space-y-2">
                    {fetching && (local.items || []).length === 0 ? (
                      Array.from({ length: 2 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl animate-pulse">
                          <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                          </div>
                          <div className="h-3 bg-gray-200 rounded w-16" />
                        </div>
                      ))
                    ) : (local.items || []).length === 0 ? (
                      <div className="p-4 bg-gray-50 rounded-2xl text-center">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">No items</p>
                      </div>
                    ) : (
                      (local.items || []).map((item, i) => {
                        const product   = item.product || {};
                        const unitPrice = parseFloat(item.price_at_purchase || product.price || 0);
                        const qty       = item.quantity || 1;
                        const lineTotal = (unitPrice * qty).toFixed(2);
                        const imgSrc    = product.image || product.image_url || product.thumbnail || null;
                        return (
                          <div key={item.id || i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl">
                            <ProductImage src={imgSrc} name={product.name} size={44} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-gray-800 leading-snug">
                                {product.name || `Product #${i + 1}`}
                              </p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-0.5 rounded-lg">Qty × {qty}</span>
                                <span className="text-[10px] text-gray-400 font-bold">@ ₹{unitPrice.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[12px] font-black text-gray-900">₹{lineTotal}</p>
                              {product.id && (
                                <a href={`/admin/products/${product.id}`} target="_blank" rel="noreferrer"
                                  className="inline-flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-orange-500 transition mt-1"
                                  onClick={(e) => e.stopPropagation()}>
                                  View <ExternalLink size={8} />
                                </a>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </section>

                {local.notes && (
                  <section>
                    <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">Notes</p>
                    <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl">
                      <p className="text-sm text-amber-800 font-bold leading-relaxed">{local.notes}</p>
                    </div>
                  </section>
                )}
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-gray-100 flex-shrink-0 space-y-3">
                {local.items?.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtotal</p>
                      <p className="text-[11px] font-black text-gray-700">₹{computedTotal}</p>
                    </div>
                    <div className="h-px bg-gray-100 my-1" />
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Total</p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">₹{local.total_price}</p>
                </div>

                {/* Full confirm page CTA in footer if pending */}
                {isPending && (
                  <button
                    onClick={() => { onClose(); onOpenConfirm(local); }}
                    className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-black text-white
                      text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all shadow-lg mt-1"
                  >
                    <BadgeCheck size={13} /> Review & Confirm Order
                  </button>
                )}

                <button onClick={() => setDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-100
                    text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600
                    hover:border-rose-200 transition-all">
                  <Trash2 size={13} /> Move to Order History
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={deleteConfirm}
        title="Move to History?"
        message={`Order #${local?.id} will be moved to Order History.`}
        confirmLabel="Move to History"
        danger={true}
        onConfirm={handleDelete}
        onCancel={() => setDeleteConfirm(false)}
      />
    </>
  );
}

/* ══ StatCard ══════════════════════════════════════════════════════════════ */
function StatCard({ label, value, sub, accent, icon: Icon }) {
  return (
    <div className="relative bg-white rounded-3xl p-5 border border-gray-100 overflow-hidden shadow-sm">
      <div className="absolute -top-5 -right-5 w-20 h-20 rounded-full opacity-[0.07]" style={{ background: accent }} />
      <div className="flex items-start justify-between mb-3">
        <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{label}</p>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: accent + "18" }}>
          <Icon size={14} style={{ color: accent }} />
        </div>
      </div>
      <p className="text-3xl font-black text-gray-900 tracking-tight leading-none">{value}</p>
      <p className="text-[10px] text-gray-400 font-bold mt-1.5">{sub}</p>
    </div>
  );
}

function SkeletonRow() {
  return (
    <tr className="border-b border-gray-50">
      {[10, 80, 110, 90, 70, 55, 20].map((w, j) => (
        <td key={j} className="px-4 py-4">
          <div className="h-3.5 rounded-lg bg-gray-100 animate-pulse" style={{ width: w }} />
        </td>
      ))}
    </tr>
  );
}

/* ══ OrderRow ══════════════════════════════════════════════════════════════ */
const OrderRow = memo(({ order, isSelected, onToggle, onClick, onStatusChange, onDelete, onConfirmClick }) => {
  const isPending = order.status === "Pending";
  return (
    <tr className={`group transition-colors cursor-pointer ${isSelected ? "bg-orange-50/50" : "hover:bg-gray-50/70"}`}>
      <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
        <input type="checkbox" checked={isSelected} onChange={onToggle}
          className="w-4 h-4 rounded-md accent-gray-900 cursor-pointer" />
      </td>
      <td className="px-4 py-4" onClick={onClick}>
        <p className="font-black text-gray-900 text-sm group-hover:text-orange-600 transition-colors">#{order.id}</p>
        <p className="text-[10px] text-gray-400 font-bold mt-0.5">{fmt(order.created_at)} · {order.items?.length || 0} items</p>
      </td>
      <td className="px-4 py-4" onClick={onClick}>
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center text-gray-600 font-black text-xs flex-shrink-0">
            {order.name?.charAt(0)?.toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-black text-gray-800 truncate max-w-[130px]">{order.name}</p>
            <p className="text-[10px] text-gray-400 font-bold">{order.user ? `@${order.user.username}` : "Guest"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-4 hidden lg:table-cell" onClick={onClick}>
        <p className="text-sm font-black text-gray-700">{order.city}</p>
        <p className="text-[10px] text-gray-400 font-bold truncate max-w-[140px]">{order.address}</p>
      </td>
      <td className="px-4 py-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 flex-wrap">
          <StatusPill status={order.status} onChange={(s) => onStatusChange(order.id, s)} />
          {/* Confirm button inline on row — only Pending */}
          {isPending && (
            <button
              onClick={(e) => { e.stopPropagation(); onConfirmClick(order); }}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-50 border border-violet-200
                text-violet-700 text-[9px] font-black uppercase tracking-widest
                hover:bg-violet-600 hover:text-white hover:border-violet-600 transition-all"
            >
              <BadgeCheck size={10} /> Confirm
            </button>
          )}
        </div>
      </td>
      <td className="px-4 py-4 text-right" onClick={onClick}>
        <p className="font-black text-sm text-gray-900">₹{order.total_price}</p>
      </td>
      <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => onDelete(order.id)} title="Move to history"
          className="w-8 h-8 rounded-xl flex items-center justify-center text-gray-300 hover:text-rose-500 hover:bg-rose-50 transition-colors opacity-0 group-hover:opacity-100">
          <Trash2 size={13} />
        </button>
      </td>
      <td className="px-3 py-4" onClick={onClick}>
        <div className="w-8 h-8 rounded-xl bg-gray-50 group-hover:bg-black flex items-center justify-center transition-colors">
          <ChevronRight size={13} className="text-gray-400 group-hover:text-white transition-colors" />
        </div>
      </td>
    </tr>
  );
});

/* ══════════════════════════════════════════════════════════════════════════
   MAIN
══════════════════════════════════════════════════════════════════════════*/
export default function OrderManagement() {
  const [orders,      setOrders]      = useState([]);
  const [allCities,   setAllCities]   = useState([]);
  const [globalStats, setGlobalStats] = useState({ total: 0, pending: 0, shipped: 0, revenue: "0" });
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [confirmOrder, setConfirmOrder] = useState(null); // ← drives overlay

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter,   setCityFilter]   = useState("");
  const [sortBy,       setSortBy]       = useState("-created_at");
  const [bulkConfirm,  setBulkConfirm]  = useState(null);
  const [deleteRowConfirm, setDeleteRowConfirm] = useState(null);

  const debouncedSearch = useDebounce(search);

  const fetchMeta = useCallback(async () => {
    try {
      const res = await API.get("admin/orders/?page_size=1000&ordering=-created_at");
      const all = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setAllCities([...new Set(all.map((o) => o.city).filter(Boolean))].sort());
      setGlobalStats({
        total:   all.length,
        pending: all.filter((o) => o.status === "Pending").length,
        shipped: all.filter((o) => o.status === "Shipped").length,
        revenue: all
          .filter((o) => o.status !== "Cancelled")
          .reduce((s, o) => s + parseFloat(o.total_price || 0), 0)
          .toFixed(0),
      });
    } catch { /* non-critical */ }
  }, []);

  useEffect(() => { fetchMeta(); }, [fetchMeta]);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (statusFilter)    params.set("status", statusFilter);
      if (cityFilter)      params.set("city",   cityFilter);
      params.set("ordering",  sortBy);
      params.set("page",      page);
      params.set("page_size", PER_PAGE);

      const res = await API.get(`admin/orders/?${params}`);
      if (Array.isArray(res.data)) {
        setOrders(res.data);
        setTotal(res.data.length);
      } else {
        setOrders(res.data.results || []);
        setTotal(res.data.count   || 0);
      }
    } catch {
      toast.error("Failed to load orders");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, cityFilter, sortBy, page]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, cityFilter, sortBy]);

  const handleSingleStatusChange = async (orderId, newStatus) => {
    const prev = [...orders];
    setOrders((p) => p.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await API.post("admin/orders/bulk-action/", { ids: [orderId], action: newStatus });
      toast.success(`Order #${orderId} → ${newStatus}`);
      fetchMeta();
    } catch {
      setOrders(prev);
      toast.error("Update failed");
    }
  };

  /* ── Admin confirm: sets status to "Admin Confirmed" ── */
  const handleAdminConfirm = async (orderId) => {
    const prev = [...orders];
    setOrders((p) => p.map((o) => o.id === orderId ? { ...o, status: "Admin Confirmed" } : o));
    try {
      await API.post("admin/orders/bulk-action/", { ids: [orderId], action: "Admin Confirmed" });
      toast.success(`Order #${orderId} confirmed ✓`);
      fetchMeta();
    } catch {
      setOrders(prev);
      toast.error("Confirmation failed");
    }
  };

  /* ── Admin cancel from confirm page ── */
  const handleAdminCancel = async (orderId) => {
    const prev = [...orders];
    setOrders((p) => p.map((o) => o.id === orderId ? { ...o, status: "Cancelled" } : o));
    try {
      await API.post("admin/orders/bulk-action/", { ids: [orderId], action: "Cancelled" });
      toast.success(`Order #${orderId} cancelled`);
      fetchMeta();
    } catch {
      setOrders(prev);
      toast.error("Cancel failed");
    }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await API.patch(`admin/orders/${orderId}/`, { is_deleted: true })
        .catch(() => API.post(`admin/orders/${orderId}/archive/`));
      setOrders((p) => p.filter((o) => o.id !== orderId));
      setTotal((t) => t - 1);
      setSelectedIds((p) => p.filter((id) => id !== orderId));
      toast.success(`Order #${orderId} moved to history`);
      fetchMeta();
    } catch {
      toast.error("Could not move order to history");
    }
  };

  const executeBulkAction = async (action) => {
    setBulkLoading(true);
    try {
      if (action === "delete") {
        await Promise.all(
          selectedIds.map((id) =>
            API.patch(`admin/orders/${id}/`, { is_deleted: true })
              .catch(() => API.post(`admin/orders/${id}/archive/`))
          )
        );
        setOrders((p) => p.filter((o) => !selectedIds.includes(o.id)));
        toast.success(`${selectedIds.length} order(s) moved to history`);
      } else {
        await API.post("admin/orders/bulk-action/", { ids: selectedIds, action });
        toast.success(`${selectedIds.length} order(s) → ${action}`);
        await fetchOrders();
      }
      setSelectedIds([]);
      fetchMeta();
    } catch {
      toast.error("Bulk update failed");
    } finally {
      setBulkLoading(false);
      setBulkConfirm(null);
    }
  };

  const allSelected = !loading && orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));
  const totalPages  = Math.ceil(total / PER_PAGE);
  const activeFilterCount = [statusFilter, cityFilter].filter(Boolean).length;

  const BULK_ACTIONS = [
    { action: "Pending",          label: "→ Pending",        danger: false },
    { action: "Admin Confirmed",  label: "→ Confirmed",      danger: false },
    { action: "Shipped",          label: "→ Shipped",        danger: false },
    { action: "Delivered",        label: "→ Delivered",      danger: false },
    { action: "Cancelled",        label: "Cancel & Restock", danger: true  },
    { action: "delete",           label: "Move to History",  danger: true  },
  ];

  return (
    <div className="space-y-6">

      {/* ── Order Confirm Overlay — full screen ── */}
      <AnimatePresence>
        {confirmOrder && (
          <OrderConfirmOverlay
            order={confirmOrder}
            onClose={() => setConfirmOrder(null)}
            onConfirm={handleAdminConfirm}
            onCancel={handleAdminCancel}
          />
        )}
      </AnimatePresence>

      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            Order Control<span className="text-orange-600">.</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
            {globalStats.total} order{globalStats.total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button onClick={() => { fetchOrders(); fetchMeta(); }}
          className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl hover:bg-orange-600
            transition shadow-lg text-[10px] font-black uppercase tracking-widest self-start sm:self-auto">
          <RefreshCw size={13} /> Refresh
        </button>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Orders"  value={globalStats.total}   sub="All time"          accent="#6366f1" icon={ShoppingBag} />
        <StatCard label="Pending"       value={globalStats.pending} sub="Awaiting action"   accent="#f59e0b" icon={Clock}       />
        <StatCard label="In Transit"    value={globalStats.shipped} sub="Currently shipped" accent="#0ea5e9" icon={Truck}       />
        <StatCard
          label="Revenue"
          value={`₹${Number(globalStats.revenue).toLocaleString()}`}
          sub="Excl. cancelled"
          accent="#10b981"
          icon={BarChart3}
        />
      </div>

      {/* FILTER BAR */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          <input type="text" placeholder="Search name or order ID…" value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition" />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition">
              <X size={13} />
            </button>
          )}
        </div>

        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition cursor-pointer">
          <option value="">All Statuses</option>
          {Object.keys(STATUS).map((s) => <option key={s} value={s}>{s}</option>)}
        </select>

        <select value={cityFilter} onChange={(e) => setCityFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition cursor-pointer">
          <option value="">All Cities</option>
          {allCities.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>

        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition cursor-pointer">
          <option value="-created_at">Newest first</option>
          <option value="created_at">Oldest first</option>
          <option value="-total_price">Highest value</option>
        </select>
      </div>

      {/* Filter chips */}
      <AnimatePresence mode="popLayout">
        {activeFilterCount > 0 && (
          <motion.div key="filter-chips" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters:</span>
            {statusFilter && (
              <motion.button key={`chip-s`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setStatusFilter("")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS[statusFilter]?.pill}`}>
                {statusFilter} <X size={10} />
              </motion.button>
            )}
            {cityFilter && (
              <motion.button key={`chip-c`} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setCityFilter("")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest">
                {cityFilter} <X size={10} />
              </motion.button>
            )}
            <button onClick={() => { setStatusFilter(""); setCityFilter(""); }}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition">
              Clear all
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div key="bulk-bar" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="flex flex-wrap items-center gap-2 bg-gray-900 px-5 py-3 rounded-2xl">
            {bulkLoading
              ? <Loader2 size={14} className="text-gray-400 animate-spin" />
              : <span className="text-[11px] font-black text-gray-400">{selectedIds.length} selected</span>
            }
            <div className="h-4 w-px bg-gray-700 mx-1" />
            {BULK_ACTIONS.map(({ action, label, danger }) => (
              <button key={action} disabled={bulkLoading} onClick={() => setBulkConfirm({ action, label, danger })}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition-colors disabled:opacity-40
                  ${danger ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                {label}
              </button>
            ))}
            <button disabled={bulkLoading} onClick={() => setSelectedIds([])}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition-colors">
              <X size={14} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLE */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Package size={28} className="text-gray-200" />
            </div>
            <div>
              <p className="font-black text-gray-700 uppercase tracking-tight">No orders found</p>
              <p className="text-gray-400 font-bold text-sm mt-1">Try adjusting your filters.</p>
            </div>
          </div>
        )}

        {(loading || orders.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[760px]">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/80">
                  <th className="px-5 py-4 w-10">
                    <input type="checkbox" checked={allSelected} disabled={loading}
                      onChange={(e) => setSelectedIds(e.target.checked ? orders.map((o) => o.id) : [])}
                      className="w-4 h-4 rounded-md accent-gray-900 cursor-pointer disabled:opacity-40" />
                  </th>
                  {["Order", "Customer", "Location", "Status", "Total", "", ""].map((h, i) => (
                    <th key={h + i}
                      className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400
                        ${h === "Total" ? "text-right" : ""}
                        ${h === "Location" ? "hidden lg:table-cell" : ""}
                        ${i >= 5 ? "w-12" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : orders.map((o) => (
                      <OrderRow
                        key={o.id}
                        order={o}
                        isSelected={selectedIds.includes(o.id)}
                        onToggle={() => setSelectedIds((p) => p.includes(o.id) ? p.filter((id) => id !== o.id) : [...p, o.id])}
                        onClick={() => setActiveOrder(o)}
                        onStatusChange={handleSingleStatusChange}
                        onDelete={() => setDeleteRowConfirm({ id: o.id })}
                        onConfirmClick={(order) => setConfirmOrder(order)}
                      />
                    ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Page {page} of {totalPages} · {total} orders
            </p>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all
                      ${p === page ? "bg-black text-white border border-black" : "border border-gray-200 text-gray-600 hover:bg-black hover:text-white hover:border-black"}`}>
                    {p}
                  </button>
                );
              })}
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all">
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Drawer */}
      <OrderDrawer
        order={activeOrder}
        onClose={() => setActiveOrder(null)}
        onStatusChange={handleSingleStatusChange}
        onDeleteOrder={handleDeleteOrder}
        onOpenConfirm={(order) => { setActiveOrder(null); setConfirmOrder(order); }}
      />

      {/* Bulk confirm */}
      <ConfirmDialog
        open={!!bulkConfirm}
        title={bulkConfirm?.label || ""}
        message={
          bulkConfirm?.action === "delete"
            ? `Move ${selectedIds.length} order(s) to history?`
            : bulkConfirm?.danger
            ? `Cancel ${selectedIds.length} order(s) and return stock?`
            : `Update ${selectedIds.length} order(s) to "${bulkConfirm?.action}".`
        }
        confirmLabel={bulkConfirm?.label || "Confirm"}
        danger={bulkConfirm?.danger ?? false}
        onConfirm={() => executeBulkAction(bulkConfirm.action)}
        onCancel={() => setBulkConfirm(null)}
      />

      {/* Row delete confirm */}
      <ConfirmDialog
        open={!!deleteRowConfirm}
        title="Move to History?"
        message={`Order #${deleteRowConfirm?.id} will be moved to Order History.`}
        confirmLabel="Move to History"
        danger={true}
        onConfirm={() => { handleDeleteOrder(deleteRowConfirm.id); setDeleteRowConfirm(null); }}
        onCancel={() => setDeleteRowConfirm(null)}
      />
    </div>
  );
}