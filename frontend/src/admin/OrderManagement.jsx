import { useState, useEffect, useCallback, useRef, memo } from "react";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight,
  Truck, CheckCircle, XCircle, Clock, MapPin,
  User, Package, AlertTriangle, RefreshCw,
  ChevronDown, ShoppingBag, BarChart3, Trash2,
  ExternalLink, ImageOff, MessageCircle, BadgeCheck,
  Phone, CheckCheck, FileText, Send, Receipt,
  Settings2, ArrowLeft, Download, Inbox
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import toast from "react-hot-toast";

const PER_PAGE     = 10;
const FROM_KEY     = "admin_wa_from_number";

/* ── status config (no Pending — that's the queue page) ── */
const STATUS = {
  "Admin Confirmed": {
    dot: "bg-violet-400",
    pill: "bg-violet-50 border-violet-200 text-violet-700",
    icon: BadgeCheck,
    headerBg: "bg-violet-50 border-violet-100",
  },
  Processing: {
    dot: "bg-blue-400",
    pill: "bg-blue-50 border-blue-200 text-blue-700",
    icon: Clock,
    headerBg: "bg-blue-50 border-blue-100",
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
  Pending: {
    dot: "bg-amber-400",
    pill: "bg-amber-50 border-amber-200 text-amber-700",
    icon: Clock,
    headerBg: "bg-amber-50 border-amber-100",
  },
};

const fmt = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

function useDebounce(v, d = 400) {
  const [dv, setDv] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setDv(v), d);
    return () => clearTimeout(id);
  }, [v, d]);
  return dv;
}

function cleanPhone(raw = "") {
  const d = raw.replace(/\D/g, "");
  if (d.startsWith("0")) return "91" + d.slice(1);
  if (d.length === 10)   return "91" + d;
  return d;
}

/* ── Bill WhatsApp message ─────────────────────────────── */
function buildBillMsg(order, fromNumber = "") {
  const items = (order.items || []).map((it) => {
    const name  = it.product?.name || it.product_name || `Item #${it.id}`;
    const qty   = it.quantity || 1;
    const price = parseFloat(it.price_at_purchase || it.product?.price || 0);
    return `  • ${name} × ${qty}  →  ₹${(price * qty).toFixed(2)}`;
  }).join("\n");

  const addr = [order.address, order.city, order.zip ? `PIN: ${order.zip}` : ""].filter(Boolean).join(", ");

  const lines = [
    `🧾 *PURCHASE RECEIPT — Order #${order.id}*`,
    `━━━━━━━━━━━━━━━━━━━━━━`,
    "",
    `*Customer:* ${order.name}`,
    `*Date:* ${fmt(order.created_at)}`,
    `*Status:* Shipped 🚚`,
    "",
    "*ITEMS:*",
    items || "  (no items)",
    "",
    `━━━━━━━━━━━━━━━━━━━━━━`,
    `*TOTAL: ₹${order.total_price}*`,
    "",
    "*DELIVERY TO:*",
    addr,
    "",
    "Thank you for your purchase! 🙏",
  ];
  if (fromNumber) lines.push("", `📞 ${fromNumber}`);
  return encodeURIComponent(lines.join("\n"));
}

/* ── PDF bill ──────────────────────────────────────────── */
function openBillPDF(order) {
  const itemRows = (order.items || []).map((it) => {
    const name  = it.product?.name || it.product_name || `Item #${it.id}`;
    const qty   = it.quantity || 1;
    const price = parseFloat(it.price_at_purchase || it.product?.price || 0);
    return `<tr>
      <td>${name}</td>
      <td style="text-align:center">${qty}</td>
      <td style="text-align:right">₹${price.toFixed(2)}</td>
      <td style="text-align:right">₹${(price * qty).toFixed(2)}</td>
    </tr>`;
  }).join("");

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8">
  <title>Invoice — Order #${order.id}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Helvetica Neue',Arial,sans-serif;color:#111;padding:40px;font-size:13px}
    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px;padding-bottom:20px;border-bottom:2px solid #111}
    .brand{font-size:28px;font-weight:900;letter-spacing:-1px;text-transform:uppercase}
    .brand span{color:#ea580c}
    .invoice-meta{text-align:right}
    .invoice-meta h2{font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:1px;color:#ea580c}
    .invoice-meta p{font-size:11px;color:#777;margin-top:4px}
    .section-label{font-size:9px;font-weight:900;text-transform:uppercase;letter-spacing:3px;color:#aaa;margin-bottom:8px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    thead tr{background:#111;color:white}
    thead th{padding:10px 12px;text-align:left;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px}
    thead th:nth-child(2){text-align:center}
    thead th:nth-child(3),thead th:nth-child(4){text-align:right}
    tbody tr{border-bottom:1px solid #f0f0f0}
    tbody td{padding:10px 12px;font-size:13px}
    .total-row{background:#f8f8f8;border-top:2px solid #111}
    .total-row td{padding:14px 12px;font-weight:900;font-size:15px}
    .status-badge{display:inline-block;background:#0ea5e9;color:white;padding:4px 12px;border-radius:20px;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:1px}
    .footer{margin-top:48px;padding-top:20px;border-top:1px solid #eee;display:flex;justify-content:space-between;font-size:11px;color:#aaa}
    @media print{body{padding:20px}@page{margin:15mm}}
  </style></head><body>
  <div class="header">
    <div>
      <div class="brand">LUXE<span>.</span></div>
      <p style="font-size:11px;color:#777;margin-top:4px">Premium Style</p>
    </div>
    <div class="invoice-meta">
      <h2>Invoice</h2>
      <p>Order #${order.id}</p>
      <p>Date: ${fmt(order.created_at)}</p>
      <p style="margin-top:8px"><span class="status-badge">Shipped</span></p>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:32px;margin-bottom:32px">
    <div>
      <div class="section-label">Bill To</div>
      <p><strong>${order.name}</strong></p>
      <p>${order.address}</p>
      <p>${order.city}${order.zip ? " — " + order.zip : ""}</p>
      ${order.phone ? `<p>📞 ${order.phone}</p>` : ""}
    </div>
    <div>
      <div class="section-label">Order Summary</div>
      <p><strong>Order Date:</strong> ${fmt(order.created_at)}</p>
      <p><strong>Items:</strong> ${(order.items || []).length}</p>
      <p><strong>Payment:</strong> Cash on Delivery</p>
    </div>
  </div>
  <div>
    <div class="section-label">Items Ordered</div>
    <table>
      <thead><tr><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th></tr></thead>
      <tbody>
        ${itemRows || `<tr><td colspan="4" style="text-align:center;padding:16px;color:#aaa">No item details available</td></tr>`}
        <tr class="total-row">
          <td colspan="3" style="text-align:right">Order Total</td>
          <td style="text-align:right">₹${order.total_price}</td>
        </tr>
      </tbody>
    </table>
  </div>
  <div class="footer">
    <p>Thank you for shopping with LUXE.</p>
    <p>This is a computer-generated invoice.</p>
  </div>
  <script>window.onload=function(){window.print()}<\/script>
  </body></html>`;

  const win = window.open("", "_blank", "width=800,height=900");
  if (win) { win.document.write(html); win.document.close(); }
  else toast.error("Allow pop-ups to generate the bill");
}

/* ── StatusPill ──────────────────────────────────────────*/
function StatusPill({ status, onChange, disabled }) {
  const [open, setOpen] = useState(false);
  const btnRef          = useRef(null);
  const [pos, setPos]   = useState({ top: 0, left: 0 });
  const cfg = STATUS[status] || STATUS["Admin Confirmed"];

  const handleOpen = () => {
    if (disabled) return;
    const r = btnRef.current?.getBoundingClientRect();
    if (r) setPos({ top: r.bottom + window.scrollY + 6, left: r.left + window.scrollX });
    setOpen((v) => !v);
  };

  return (
    <>
      <button ref={btnRef} disabled={disabled} onClick={handleOpen}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
          ${cfg.pill} ${disabled ? "opacity-50 cursor-not-allowed" : "hover:shadow-md cursor-pointer"}`}>
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
              style={{ position: "fixed", top: pos.top, left: pos.left }}
              className="z-[70] bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden min-w-[180px]"
            >
              {Object.entries(STATUS).filter(([k]) => k !== "Pending").map(([key, c]) => (
                <button key={key} onClick={() => { onChange(key); setOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-[10px] font-black uppercase tracking-widest hover:bg-gray-50 transition-colors
                    ${status === key ? c.pill.split(" ").find((x) => x.startsWith("text-")) || "text-gray-900" : "text-gray-500"}`}>
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

/* ── ConfirmDialog ───────────────────────────────────────*/
function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]" onClick={onCancel} />
          <motion.div key="box"
            initial={{ opacity: 0, scale: 0.95, y: 10 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 10 }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm mx-4">
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
                Back
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

/* ── BillSection — shown in drawer when order is Shipped ─*/
function BillSection({ order }) {
  const [billSent,   setBillSent]   = useState(false);
  const [fromNumber, setFromNumber] = useState(() => localStorage.getItem(FROM_KEY) || "");

  useEffect(() => {
    if (fromNumber) localStorage.setItem(FROM_KEY, fromNumber);
  }, [fromNumber]);

  const toNum      = order?.phone ? cleanPhone(order.phone) : "";
  const waBillLink = toNum ? `https://wa.me/${toNum}?text=${buildBillMsg(order, fromNumber)}` : null;

  return (
    <section className="rounded-2xl border-2 border-sky-200 bg-sky-50 overflow-hidden">
      <div className="bg-sky-500 px-5 py-3 flex items-center gap-2">
        <Receipt size={14} className="text-white" />
        <p className="text-[10px] font-black uppercase tracking-widest text-white">Send Bill to Customer</p>
      </div>
      <div className="p-5 space-y-4">
        <p className="text-[11px] font-bold text-sky-700">
          Order is <strong>Shipped</strong> — send the customer their purchase receipt.
        </p>

        {/* From number */}
        <div className="space-y-1">
          <p className="text-[9px] font-black uppercase tracking-[0.3em] text-sky-600 flex items-center gap-1.5">
            <Settings2 size={10} /> Your Number (From)
          </p>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-base select-none">🇮🇳</span>
            <input type="tel" value={fromNumber} onChange={(e) => setFromNumber(e.target.value)}
              placeholder="+91 98765 43210"
              className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-sky-200 bg-white text-sm font-bold outline-none focus:border-sky-400 transition" />
          </div>
        </div>

        {/* Customer number */}
        <div className="px-4 py-2.5 rounded-xl bg-white border border-sky-100 text-sm font-bold text-gray-700 flex items-center gap-2">
          <span className="text-base">📱</span>
          {order.phone || <span className="text-gray-400 italic">No phone number</span>}
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 gap-2">
          {waBillLink ? (
            <a href={waBillLink} target="_blank" rel="noreferrer" onClick={() => setBillSent(true)}
              className={`flex items-center justify-center gap-2 py-3 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all
                ${billSent ? "bg-emerald-100 text-emerald-700 border border-emerald-200" : "bg-[#25D366] text-white hover:bg-[#1ebe5d] active:scale-95 shadow-sm"}`}>
              {billSent ? <><CheckCheck size={12} /> Sent</> : <><Send size={12} /> Send via WhatsApp</>}
            </a>
          ) : (
            <div className="flex items-center justify-center gap-2 py-3 rounded-xl bg-gray-100 text-gray-400 text-[10px] font-black uppercase tracking-widest cursor-not-allowed">
              <Phone size={12} /> No Phone
            </div>
          )}
          <button onClick={() => openBillPDF(order)}
            className="flex items-center justify-center gap-2 py-3 rounded-xl bg-sky-600 text-white font-black uppercase text-[10px] tracking-widest hover:bg-sky-700 active:scale-95 transition shadow-sm">
            <FileText size={12} /> Print / PDF
          </button>
        </div>

        {billSent && (
          <p className="text-[10px] font-bold text-emerald-600 text-center">
            ✓ Bill sent to {order.phone}
          </p>
        )}
      </div>
    </section>
  );
}

/* ── ProductImage ────────────────────────────────────────*/
function ProductImage({ src, name, size = 44 }) {
  const [err, setErr] = useState(false);
  if (!src || err) {
    return (
      <div className="rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0" style={{ width: size, height: size }}>
        <ImageOff size={size * 0.35} className="text-gray-300" />
      </div>
    );
  }
  return <img src={src} alt={name} onError={() => setErr(true)} className="rounded-xl object-cover flex-shrink-0" style={{ width: size, height: size }} />;
}

/* ── OrderDrawer ─────────────────────────────────────────*/
function OrderDrawer({ order, onClose, onStatusChange, onDeleteOrder }) {
  const [local,         setLocal]         = useState(order);
  const [fetching,      setFetching]      = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  useEffect(() => {
    if (!order) { setLocal(null); return; }
    setLocal(order);
    setFetching(true);
    API.get(`admin/orders/${order.id}/`)
      .then((r) => setLocal(r.data))
      .catch(() => {})
      .finally(() => setFetching(false));
  }, [order?.id]);

  const handleStatus = (id, s) => {
    setLocal((p) => p ? { ...p, status: s } : p);
    onStatusChange(id, s);
  };

  const handleDelete = () => {
    setDeleteConfirm(false);
    onDeleteOrder(local.id);
    onClose();
  };

  const cfg       = local ? STATUS[local.status] || STATUS["Admin Confirmed"] : null;
  const isShipped = local?.status === "Shipped";
  const computed  = local?.items?.length
    ? local.items.reduce((s, it) => s + parseFloat(it.price_at_purchase || 0) * (it.quantity || 1), 0).toFixed(2)
    : local?.total_price;

  return (
    <>
      <AnimatePresence>
        {local && (
          <>
            <motion.div key="bg" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40]" onClick={onClose} />
            <motion.div key="panel"
              initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 32, stiffness: 300 }}
              className="fixed right-0 top-0 h-full w-full max-w-[440px] bg-white z-[50] shadow-2xl flex flex-col">

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
                      className="p-2.5 rounded-xl hover:bg-rose-50 transition-colors text-gray-400 hover:text-rose-500">
                      <Trash2 size={16} />
                    </button>
                    <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-black/10 transition-colors text-gray-500">
                      <X size={18} />
                    </button>
                  </div>
                </div>
                <StatusPill status={local.status} onChange={(s) => handleStatus(local.id, s)} />
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-6 space-y-5">

                {/* Customer */}
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
                      {local.phone && <p className="text-[10px] text-gray-400 font-bold mt-0.5">{local.phone}</p>}
                    </div>
                  </div>
                </section>

                {/* Address */}
                <section>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                    <MapPin size={10} /> Shipping Address
                  </p>
                  <div className="p-4 bg-gray-50 rounded-2xl">
                    <p className="font-black text-sm text-gray-900">{local.city}</p>
                    <p className="text-sm text-gray-500 mt-0.5 leading-relaxed">{local.address}</p>
                    {local.zip && <p className="text-[10px] text-gray-400 mt-1 font-bold">PIN: {local.zip}</p>}
                    {local.phone && <p className="text-[10px] text-gray-400 mt-1 font-bold">{local.phone}</p>}
                  </div>
                </section>

                {/* Bill section — only when Shipped */}
                {isShipped && <BillSection order={local} />}

                {/* Items */}
                <section>
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                    <Package size={10} /> Items · {local.items?.length || 0}
                  </p>
                  <div className="space-y-2">
                    {fetching && !local.items?.length ? (
                      [0, 1].map((i) => (
                        <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl animate-pulse">
                          <div className="w-11 h-11 bg-gray-200 rounded-xl flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-3 bg-gray-200 rounded w-2/3" />
                            <div className="h-2.5 bg-gray-100 rounded w-1/3" />
                          </div>
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
                        const imgSrc    = product.image || product.image_url || null;
                        return (
                          <div key={item.id || i} className="flex items-start gap-3 p-3.5 bg-gray-50 rounded-2xl">
                            <ProductImage src={imgSrc} name={product.name} size={44} />
                            <div className="flex-1 min-w-0">
                              <p className="text-[11px] font-black text-gray-800 leading-snug">{product.name || `Product #${i + 1}`}</p>
                              <div className="flex items-center gap-2 mt-1.5">
                                <span className="text-[10px] font-black text-gray-500 bg-gray-200 px-2 py-0.5 rounded-lg">Qty × {qty}</span>
                                <span className="text-[10px] text-gray-400 font-bold">@ ₹{unitPrice.toFixed(2)}</span>
                              </div>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-[12px] font-black text-gray-900">₹{(unitPrice * qty).toFixed(2)}</p>
                              {product.id && (
                                <a href={`/admin/products/${product.id}`} target="_blank" rel="noreferrer"
                                  onClick={(e) => e.stopPropagation()}
                                  className="inline-flex items-center gap-0.5 text-[9px] text-gray-400 hover:text-orange-500 transition mt-1">
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
                  <div className="flex justify-between items-center">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Subtotal</p>
                    <p className="text-[11px] font-black text-gray-700">₹{computed}</p>
                  </div>
                )}
                <div className="flex justify-between items-center">
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Order Total</p>
                  <p className="text-2xl font-black text-gray-900 tracking-tight">₹{local.total_price}</p>
                </div>
                <button onClick={() => setDeleteConfirm(true)}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-rose-100 text-rose-400 text-[10px] font-black uppercase tracking-widest hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-all">
                  <Trash2 size={13} /> Move to Order History
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ConfirmDialog open={deleteConfirm} title="Move to History?"
        message={`Order #${local?.id} will be moved to Order History.`}
        confirmLabel="Move to History" danger
        onConfirm={handleDelete} onCancel={() => setDeleteConfirm(false)} />
    </>
  );
}

/* ── StatCard ────────────────────────────────────────────*/
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

/* ── OrderRow ────────────────────────────────────────────*/
const OrderRow = memo(({ order, isSelected, onToggle, onClick, onStatusChange, onDelete }) => (
  <tr className={`group transition-colors cursor-pointer ${isSelected ? "bg-orange-50/50" : "hover:bg-gray-50/70"}`}>
    <td className="px-5 py-4" onClick={(e) => e.stopPropagation()}>
      <input type="checkbox" checked={isSelected} onChange={onToggle} className="w-4 h-4 rounded-md accent-gray-900 cursor-pointer" />
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
      <StatusPill status={order.status} onChange={(s) => onStatusChange(order.id, s)} />
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
));

/* ══ PAGE ════════════════════════════════════════════════*/
export default function OrderManagement() {
  const [orders,      setOrders]      = useState([]);
  const [allCities,   setAllCities]   = useState([]);
  const [stats,       setStats]       = useState({ total: 0, admin_confirmed: 0, shipped: 0, revenue: "0" });
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const [search,       setSearch]       = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [cityFilter,   setCityFilter]   = useState("");
  const [sortBy,       setSortBy]       = useState("-created_at");
  const [bulkConfirm,  setBulkConfirm]  = useState(null);
  const [deleteConfirm,setDeleteConfirm]= useState(null);

  const debouncedSearch = useDebounce(search);

  const fetchStats = useCallback(async () => {
    try {
      const res = await API.get("admin/orders/stats/");
      setStats(res.data);
    } catch { /* non-critical */ }
  }, []);

  const fetchCities = useCallback(async () => {
    try {
      const res = await API.get("admin/orders/?page_size=500");
      const all = Array.isArray(res.data) ? res.data : (res.data.results || []);
      setAllCities([...new Set(all.map((o) => o.city).filter(Boolean))].sort());
    } catch { /* non-critical */ }
  }, []);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search",    debouncedSearch);
      if (statusFilter)    params.set("status",    statusFilter);
      if (cityFilter)      params.set("city",      cityFilter);
      params.set("ordering",  sortBy);
      params.set("page",      page);
      params.set("page_size", PER_PAGE);
      const res = await API.get(`admin/orders/?${params}`);
      if (Array.isArray(res.data)) { setOrders(res.data); setTotal(res.data.length); }
      else { setOrders(res.data.results || []); setTotal(res.data.count || 0); }
    } catch { toast.error("Failed to load orders"); }
    finally { setLoading(false); }
  }, [debouncedSearch, statusFilter, cityFilter, sortBy, page]);

  useEffect(() => { fetchStats(); fetchCities(); }, []);
  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter, cityFilter, sortBy]);

  const handleSingleStatus = async (orderId, newStatus) => {
    const prev = [...orders];
    setOrders((p) => p.map((o) => o.id === orderId ? { ...o, status: newStatus } : o));
    try {
      await API.post("admin/orders/bulk-action/", { ids: [orderId], action: newStatus });
      toast.success(`Order #${orderId} → ${newStatus}`);
      fetchStats();
    } catch { setOrders(prev); toast.error("Update failed"); }
  };

  const handleDeleteOrder = async (orderId) => {
    try {
      await API.patch(`admin/orders/${orderId}/`, { is_deleted: true })
        .catch(() => API.post(`admin/orders/${orderId}/archive/`));
      setOrders((p) => p.filter((o) => o.id !== orderId));
      setTotal((t) => t - 1);
      setSelectedIds((p) => p.filter((id) => id !== orderId));
      toast.success(`Order #${orderId} moved to history`);
      fetchStats();
    } catch { toast.error("Could not move order to history"); }
  };

  const executeBulk = async (action) => {
    setBulkLoading(true);
    try {
      if (action === "delete") {
        await Promise.all(selectedIds.map((id) =>
          API.patch(`admin/orders/${id}/`, { is_deleted: true })
            .catch(() => API.post(`admin/orders/${id}/archive/`))
        ));
        setOrders((p) => p.filter((o) => !selectedIds.includes(o.id)));
        toast.success(`${selectedIds.length} order(s) moved to history`);
      } else {
        await API.post("admin/orders/bulk-action/", { ids: selectedIds, action });
        toast.success(`${selectedIds.length} order(s) → ${action}`);
        await fetchOrders();
      }
      setSelectedIds([]);
      fetchStats();
    } catch { toast.error("Bulk update failed"); }
    finally { setBulkLoading(false); setBulkConfirm(null); }
  };

  const allSelected  = !loading && orders.length > 0 && orders.every((o) => selectedIds.includes(o.id));
  const totalPages   = Math.ceil(total / PER_PAGE);
  const activeFilters = [statusFilter, cityFilter].filter(Boolean).length;

  const BULK_ACTIONS = [
    { action: "Admin Confirmed", label: "→ Confirmed",      danger: false },
    { action: "Shipped",         label: "→ Shipped",        danger: false },
    { action: "Delivered",       label: "→ Delivered",      danger: false },
    { action: "Cancelled",       label: "Cancel & Restock", danger: true  },
    { action: "delete",          label: "Move to History",  danger: true  },
  ];

  return (
    <div className="space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            Order Management<span className="text-orange-600">.</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
            {stats.total} active order{stats.total !== 1 ? "s" : ""}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Link back to confirm queue */}
          <a href="/admin/confirmation-queue"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-900 hover:text-white hover:border-gray-900 transition-all">
            <Inbox size={12} /> Confirm Queue
          </a>
          <button onClick={() => { fetchOrders(); fetchStats(); }}
            className="inline-flex items-center gap-2 bg-black text-white px-4 py-2.5 rounded-2xl hover:bg-orange-600 transition shadow-lg text-[10px] font-black uppercase tracking-widest">
            <RefreshCw size={12} /> Refresh
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Active"    value={stats.total}          sub="Excl. history"       accent="#6366f1" icon={ShoppingBag} />
        <StatCard label="Confirmed"       value={stats.admin_confirmed || 0} sub="Ready to ship" accent="#7c3aed" icon={BadgeCheck}  />
        <StatCard label="In Transit"      value={stats.shipped || 0}   sub="Currently shipped"   accent="#0ea5e9" icon={Truck}       />
        <StatCard label="Revenue"         value={`₹${Number(stats.revenue).toLocaleString()}`} sub="Excl. cancelled" accent="#10b981" icon={BarChart3} />
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={14} />
          <input type="text" placeholder="Search name or order ID…" value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition" />
          {search && <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700"><X size={13} /></button>}
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition cursor-pointer">
          <option value="">All Statuses</option>
          {Object.keys(STATUS).filter(k => k !== "Pending").map((s) => <option key={s} value={s}>{s}</option>)}
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

      {/* Active filter chips */}
      <AnimatePresence mode="popLayout">
        {activeFilters > 0 && (
          <motion.div key="chips" initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            className="flex flex-wrap items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters:</span>
            {statusFilter && (
              <motion.button key="s" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setStatusFilter("")}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest ${STATUS[statusFilter]?.pill}`}>
                {statusFilter} <X size={10} />
              </motion.button>
            )}
            {cityFilter && (
              <motion.button key="c" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                onClick={() => setCityFilter("")}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest">
                {cityFilter} <X size={10} />
              </motion.button>
            )}
            <button onClick={() => { setStatusFilter(""); setCityFilter(""); }}
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-rose-500 transition">Clear all</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk action bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div key="bulk" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            className="flex flex-wrap items-center gap-2 bg-gray-900 px-5 py-3 rounded-2xl">
            {bulkLoading ? <Loader2 size={14} className="text-gray-400 animate-spin" /> : <span className="text-[11px] font-black text-gray-400">{selectedIds.length} selected</span>}
            <div className="h-4 w-px bg-gray-700 mx-1" />
            {BULK_ACTIONS.map(({ action, label, danger }) => (
              <button key={action} disabled={bulkLoading} onClick={() => setBulkConfirm({ action, label, danger })}
                className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wide transition disabled:opacity-40
                  ${danger ? "bg-rose-500/20 hover:bg-rose-500/30 text-rose-300" : "bg-white/10 hover:bg-white/20 text-white"}`}>
                {label}
              </button>
            ))}
            <button disabled={bulkLoading} onClick={() => setSelectedIds([])}
              className="ml-auto p-1.5 rounded-lg hover:bg-white/10 text-gray-500 transition"><X size={14} /></button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {!loading && orders.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Package size={28} className="text-gray-200" />
            </div>
            <div>
              <p className="font-black text-gray-700 uppercase tracking-tight">No orders found</p>
              <p className="text-gray-400 font-bold text-sm mt-1">Try adjusting filters or check the confirm queue.</p>
            </div>
            <a href="/admin/order-confirmation"
              className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition shadow-lg">
              <Inbox size={12} /> Go to Confirm Queue
            </a>
          </div>
        )}

        {(loading || orders.length > 0) && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[740px]">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/80">
                  <th className="px-5 py-4 w-10">
                    <input type="checkbox" checked={allSelected} disabled={loading}
                      onChange={(e) => setSelectedIds(e.target.checked ? orders.map((o) => o.id) : [])}
                      className="w-4 h-4 rounded-md accent-gray-900 cursor-pointer disabled:opacity-40" />
                  </th>
                  {["Order", "Customer", "Location", "Status", "Total", "", ""].map((h, i) => (
                    <th key={h + i} className={`px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 ${h === "Total" ? "text-right" : ""} ${h === "Location" ? "hidden lg:table-cell" : ""} ${i >= 5 ? "w-12" : ""}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading
                  ? Array.from({ length: 6 }).map((_, i) => <SkeletonRow key={i} />)
                  : orders.map((o) => (
                      <OrderRow key={o.id} order={o}
                        isSelected={selectedIds.includes(o.id)}
                        onToggle={() => setSelectedIds((p) => p.includes(o.id) ? p.filter((id) => id !== o.id) : [...p, o.id])}
                        onClick={() => setActiveOrder(o)}
                        onStatusChange={handleSingleStatus}
                        onDelete={() => setDeleteConfirm({ id: o.id })}
                      />
                    ))}
              </tbody>
            </table>
          </div>
        )}

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
                    className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all ${p === page ? "bg-black text-white border border-black" : "border border-gray-200 text-gray-600 hover:bg-black hover:text-white hover:border-black"}`}>
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
        onStatusChange={handleSingleStatus}
        onDeleteOrder={handleDeleteOrder}
      />

      <ConfirmDialog open={!!bulkConfirm} title={bulkConfirm?.label || ""}
        message={bulkConfirm?.action === "delete"
          ? `Move ${selectedIds.length} order(s) to history?`
          : bulkConfirm?.danger
          ? `Cancel ${selectedIds.length} order(s) and return stock?`
          : `Update ${selectedIds.length} order(s) to "${bulkConfirm?.action}".`}
        confirmLabel={bulkConfirm?.label || "Confirm"} danger={bulkConfirm?.danger ?? false}
        onConfirm={() => executeBulk(bulkConfirm.action)} onCancel={() => setBulkConfirm(null)} />

      <ConfirmDialog open={!!deleteConfirm} title="Move to History?"
        message={`Order #${deleteConfirm?.id} will be moved to Order History.`}
        confirmLabel="Move to History" danger
        onConfirm={() => { handleDeleteOrder(deleteConfirm.id); setDeleteConfirm(null); }}
        onCancel={() => setDeleteConfirm(null)} />
    </div>
  );
}