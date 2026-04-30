import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLang } from "../context/LangContext";
import API from "../services/api";
import toast from "react-hot-toast";
import {
  ChevronDown, CheckCircle2, Truck, Clock,
  Camera, User, Mail, Phone, MapPin, Building2,
  Settings, ShoppingBag, XCircle, RefreshCcw,
  PackageSearch, AlertCircle, Ban, Box
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

/* ── Status config ─────────────────────────────────────────────────────────── */
const STATUS_CONFIG = {
  "Pending": {
    label: "Pending",
    color: "text-amber-600",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
    step: 0,
  },
  "Cancellation Requested": {
    label: "Cancel Requested",
    color: "text-orange-600",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: AlertCircle,
    step: -1,
  },
  "Cancelled": {
    label: "Cancelled",
    color: "text-red-600",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: Ban,
    step: -1,
  },
  "Shipped": {
    label: "Shipped",
    color: "text-blue-600",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: Truck,
    step: 1,
  },
  "Delivered": {
    label: "Delivered",
    color: "text-green-600",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: CheckCircle2,
    step: 2,
  },
};

const PROGRESS_STEPS = ["Pending", "Shipped", "Delivered"];

/* ── Cancel Confirmation Modal ───────────────────────────────────────────── */
function CancelModal({ orderId, onConfirm, onClose }) {
  const { t } = useLang();
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
        <motion.div
          className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-5">
            <XCircle size={32} />
          </div>
          <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">{t("confirm")}</h3>
          <p className="text-gray-500 text-sm font-medium mb-2">
            {t("cancel")} Order #{orderId}?
          </p>
          <p className="text-gray-400 text-xs font-bold mb-8">
            {t("loading")}
          </p>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-black uppercase tracking-widest text-xs hover:border-gray-400 transition-all"
            >
              {t("back")}
            </button>
            <button
              onClick={() => onConfirm(orderId)}
              className="flex-1 py-3 rounded-2xl bg-red-600 text-white font-black uppercase tracking-widest text-xs hover:bg-red-700 transition-all"
            >
              {t("cancel")}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

/* ── Status badge ────────────────────────────────────────────────────────── */
function StatusBadge({ status }) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG["Pending"];
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border ${cfg.color} ${cfg.bg} ${cfg.border}`}>
      <Icon size={11} />
      {cfg.label}
    </span>
  );
}

/* ── Progress bar ────────────────────────────────────────────────────────── */
function OrderProgress({ status }) {
  const cfg = STATUS_CONFIG[status];
  if (!cfg || cfg.step < 0) return null;
  const currentStep = cfg.step;

  return (
    <div className="flex items-center gap-0 mt-4">
      {PROGRESS_STEPS.map((step, i) => {
        const done    = i <= currentStep;
        const active  = i === currentStep;
        const StepCfg = STATUS_CONFIG[step];
        const StepIcon = StepCfg.icon;
        return (
          <div key={step} className="flex items-center flex-1 last:flex-none">
            <div className={`flex flex-col items-center gap-1 ${i < PROGRESS_STEPS.length - 1 ? "flex-1" : ""}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all
                ${done  ? "bg-black border-black text-white" : "bg-gray-50 border-gray-200 text-gray-300"}
                ${active ? "ring-4 ring-black/10" : ""}`}>
                <StepIcon size={14} />
              </div>
              <span className={`text-[8px] font-black uppercase tracking-widest ${done ? "text-black" : "text-gray-300"}`}>
                {step}
              </span>
            </div>
            {i < PROGRESS_STEPS.length - 1 && (
              <div className={`flex-1 h-0.5 mb-5 mx-1 transition-all ${i < currentStep ? "bg-black" : "bg-gray-100"}`} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Single order card ───────────────────────────────────────────────────── */
function OrderCard({ order, onCancelRequest, onReorder }) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const date = new Date(order.created_at).toLocaleDateString("en-IN", {
    day: "numeric", month: "short", year: "numeric",
  });

  const canCancel  = order.status === "Pending";
  const canReorder = ["Delivered", "Cancelled"].includes(order.status);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white border border-gray-100 rounded-3xl overflow-hidden hover:border-gray-200 hover:shadow-md transition-all"
    >
      <div
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-6 cursor-pointer"
        onClick={() => setExpanded((v) => !v)}
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center flex-shrink-0">
            <ShoppingBag size={20} className="text-gray-400" />
          </div>
          <div>
            <p className="font-black uppercase tracking-tighter text-gray-900 text-lg leading-none">
              Order #{order.id}
            </p>
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-1">{date}</p>
          </div>
        </div>
        <div className="flex items-center gap-4 ml-16 sm:ml-0">
          <StatusBadge status={order.status} />
          <span className="font-black text-gray-900">₹{order.total_price}</span>
          <ChevronDown
            size={16}
            className={`text-gray-400 transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}
          />
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-6 pb-6 space-y-6 border-t border-gray-50 pt-5">
              <OrderProgress status={order.status} />

              {(order.status === "Cancelled" || order.status === "Cancellation Requested") && (
                <div className={`flex items-center gap-3 p-4 rounded-2xl border
                  ${order.status === "Cancelled"
                    ? "bg-red-50 border-red-100 text-red-600"
                    : "bg-orange-50 border-orange-100 text-orange-600"}`}>
                  <AlertCircle size={16} className="flex-shrink-0" />
                  <p className="text-[11px] font-black uppercase tracking-widest">
                    {order.status === "Cancelled"
                      ? t("cancel")
                      : t("loading")}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("address")}</p>
                  <p className="font-black text-gray-900 text-sm">{order.name}</p>
                  <p className="text-xs text-gray-500 font-bold">{order.address}, {order.city}</p>
                  <p className="text-xs text-gray-500 font-bold">{order.phone}</p>
                </div>
                <div className="bg-gray-50 rounded-2xl p-4 space-y-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("orderSummary")}</p>
                  <p className="font-black text-gray-900 text-sm">
                    {order.items?.length} {order.items?.length === 1 ? "product" : "products"}
                  </p>
                  <p className="text-xs text-gray-500 font-bold">{t("price")}: ₹{order.total_price}</p>
                </div>
              </div>

              {order.items && order.items.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3">{t("products")}</p>
                  {order.items.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-2.5 border-b border-gray-50 last:border-0">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center flex-shrink-0">
                          <Box size={13} className="text-gray-400" />
                        </div>
                        <p className="text-sm font-bold text-gray-800">{item.product_name}</p>
                      </div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                        ×{item.quantity}
                      </span>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-wrap gap-3 pt-2">
                {canCancel && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onCancelRequest(order.id); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-red-200 text-red-600 bg-red-50 hover:bg-red-600 hover:text-white font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                  >
                    <XCircle size={13} /> {t("cancel")}
                  </button>
                )}
                {canReorder && (
                  <button
                    onClick={(e) => { e.stopPropagation(); onReorder(order.id); }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 bg-gray-50 hover:bg-black hover:text-white hover:border-black font-black uppercase text-[10px] tracking-widest transition-all active:scale-95"
                  >
                    <RefreshCcw size={13} /> {t("refresh")}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ── helper: map raw API response → profile state ──────────────────────────
   API returns first_name / last_name (and optionally name via SerializerMethodField).
   We combine them into a single "name" string for the form.
──────────────────────────────────────────────────────────────────────────── */
function buildProfileState(data) {
  const fullName =
    (data.name && data.name.trim())                                          ||
    [data.first_name, data.last_name].filter(Boolean).join(" ").trim()      ||
    data.username                                                             ||
    "";

  return {
    name:    fullName,
    email:   data.email   || "",
    image:   data.image   || null,
    phone:   data.phone   || "",
    address: data.address || "",
    city:    data.city    || "",
  };
}

/* ── helper: keep localStorage in sync so Navbar reflects changes ────────── */
function syncToStorage(data) {
  if (data.name)  localStorage.setItem("user_name",  data.name);
  if (data.email) localStorage.setItem("user_email", data.email);
}

/* ══ MAIN COMPONENT ══════════════════════════════════════════════════════════ */
function Profile() {
  const { t } = useLang();
  const navigate = useNavigate();
  const [activeTab,     setActiveTab]     = useState("orders");
  const [profile,       setProfile]       = useState({
    name: "", email: "", image: null,
    phone: "", address: "", city: "",
  });
  const [preview,       setPreview]       = useState(null);
  const [orders,        setOrders]        = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [updating,      setUpdating]      = useState(false);
  const [cancelOrderId, setCancelOrderId] = useState(null);
  const fileInputRef = useRef();

  useEffect(() => { fetchInitialData(); }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [profRes, ordRes] = await Promise.all([
        API.get("profile/"),
        API.get("orders/"),
      ]);
      const profileData = buildProfileState(profRes.data);
      setProfile(profileData);
      syncToStorage(profileData);
      setOrders(ordRes.data || []);
    } catch {
      toast.error(t("error"));
    } finally {
      setLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setUpdating(true);
    const toastId = toast.loading(t("loading"));

    const formData = new FormData();
    formData.append("name",    profile.name);
    formData.append("phone",   profile.phone);
    formData.append("address", profile.address);
    formData.append("city",    profile.city);
    if (fileInputRef.current?.files[0]) {
      formData.append("image", fileInputRef.current.files[0]);
    }

    try {
      const res = await API.patch("profile/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const updatedProfile = buildProfileState(res.data);
      setProfile(updatedProfile);
      syncToStorage(updatedProfile);
      toast.success(t("save"), { id: toastId });
      setPreview(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || t("error"), { id: toastId });
    } finally {
      setUpdating(false);
    }
  };

  const handleCancelRequest   = (orderId) => setCancelOrderId(orderId);

  const handleCancelConfirmed = async (orderId) => {
    setCancelOrderId(null);
    try {
      const res = await API.patch(`orders/${orderId}/`, { status: "Cancelled" });
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
      toast.success(t("cancel"));
    } catch {
      toast.error(t("error"));
    }
  };

  const handleReorder = async (orderId) => {
    const toastId = toast.loading(t("loading"));
    try {
      const res = await API.post(`orders/${orderId}/reorder/`);
      setOrders((prev) => prev.map((o) => (o.id === orderId ? res.data : o)));
      toast.success(t("confirm"), { id: toastId });
    } catch (err) {
      toast.error(err.response?.data?.error || t("error"), { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-white text-black selection:bg-black selection:text-white">

      {cancelOrderId && (
        <CancelModal
          orderId={cancelOrderId}
          onConfirm={handleCancelConfirmed}
          onClose={() => setCancelOrderId(null)}
        />
      )}

      <div className="max-w-6xl mx-auto px-6 py-16 md:py-24">

        {/* ── HEADER ── */}
        <header className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-16">
          <div>
            <h1 className="text-6xl md:text-8xl font-black uppercase italic tracking-tighter leading-none">
              Member<span className="text-orange-600">.</span>
            </h1>
            <p className="mt-4 text-gray-500 font-medium uppercase tracking-[0.3em] text-[10px]">
              {profile.email ? `Exclusive Access — ${profile.email}` : t("loading")}
            </p>
          </div>

          <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner">
            <button
              onClick={() => setActiveTab("orders")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                ${activeTab === "orders" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-black"}`}
            >
              <ShoppingBag size={14} /> {t("myOrders")}
              {orders.length > 0 && (
                <span className="bg-orange-600 text-white text-[8px] font-black px-1.5 py-0.5 rounded-full ml-0.5">
                  {orders.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
                ${activeTab === "settings" ? "bg-white shadow-sm text-black" : "text-gray-400 hover:text-black"}`}
            >
              <Settings size={14} /> {t("settings")}
            </button>
          </div>
        </header>

        {/* ── MAIN ── */}
        <main>
          {loading ? (
            <div className="grid grid-cols-1 gap-6 animate-pulse">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-gray-50 rounded-3xl" />
              ))}
            </div>
          ) : (
            <AnimatePresence mode="wait">

              {/* ── ORDERS TAB ── */}
              {activeTab === "orders" && (
                <motion.div
                  key="orders-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="space-y-4"
                >
                  {orders.length === 0 ? (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex flex-col items-center justify-center py-32 gap-5 text-center"
                    >
                      <div className="w-20 h-20 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
                        <PackageSearch size={32} className="text-gray-200" />
                      </div>
                      <div>
                        <p className="text-xl font-black uppercase italic tracking-tighter text-gray-800 mb-2">{t("noData")}</p>
                        <p className="text-gray-400 font-bold text-sm">{t("tryOther")}</p>
                      </div>
                      <button
                        onClick={() => navigate("/shop")}
                        className="flex items-center gap-2 bg-black text-white px-7 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-orange-600 transition-all mt-2"
                      >
                        <ShoppingBag size={13} /> {t("shopAll")}
                      </button>
                    </motion.div>
                  ) : (
                    orders.map((order) => (
                      <OrderCard
                        key={order.id}
                        order={order}
                        onCancelRequest={handleCancelRequest}
                        onReorder={handleReorder}
                      />
                    ))
                  )}
                </motion.div>
              )}

              {/* ── SETTINGS TAB ── */}
              {activeTab === "settings" && (
                <motion.div
                  key="settings-tab"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className="max-w-4xl mx-auto"
                >
                  <form onSubmit={handleProfileUpdate} className="space-y-12">

                    {/* Avatar */}
                    <div className="flex flex-col items-center gap-6">
                      <div className="relative group">
                        <div className="w-48 h-48 rounded-full overflow-hidden border-8 border-gray-50 shadow-2xl bg-gray-100 transition-transform group-hover:scale-[1.02] duration-500">
                          {preview || profile.image ? (
                            <img
                              src={
                                preview ||
                                (profile.image?.startsWith("http")
                                  ? profile.image
                                  : `http://127.0.0.1:8000${profile.image}`)
                              }
                              className="w-full h-full object-cover"
                              alt={t("profile")}
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-300 bg-gray-50">
                              <User size={64} />
                            </div>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current.click()}
                          className="absolute bottom-2 right-2 p-4 bg-black text-white rounded-full hover:bg-orange-600 transition-colors shadow-2xl"
                          aria-label={t("edit")}
                        >
                          <Camera size={20} />
                        </button>
                        <input
                          type="file" hidden ref={fileInputRef} accept="image/*"
                          onChange={(e) => setPreview(URL.createObjectURL(e.target.files[0]))}
                        />
                      </div>
                    </div>

                    {/* Form fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                      {/* Visible Name */}
                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">
                          {t("fullName")}
                        </label>
                        <div className="relative group">
                          <User className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                          <input
                            className="w-full pl-14 pr-6 py-5 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-black outline-none transition-all font-bold text-sm"
                            value={profile.name}
                            placeholder={t("fullName")}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t("phone")}</label>
                        <div className="relative group">
                          <Phone className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                          <input
                            className="w-full pl-14 pr-6 py-5 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-black outline-none transition-all font-bold text-sm"
                            value={profile.phone}
                            onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                            placeholder="+91 ..."
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t("city")}</label>
                        <div className="relative group">
                          <Building2 className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                          <input
                            className="w-full pl-14 pr-6 py-5 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-black outline-none transition-all font-bold text-sm"
                            value={profile.city}
                            onChange={(e) => setProfile({ ...profile, city: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-3">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t("emailAddress")}</label>
                        <div className="relative opacity-50">
                          <Mail className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-300" size={18} />
                          <input
                            className="w-full pl-14 pr-6 py-5 rounded-3xl border border-gray-100 bg-gray-100 cursor-not-allowed font-bold text-sm"
                            value={profile.email}
                            readOnly
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t("address")}</label>
                      <div className="relative group">
                        <MapPin className="absolute left-5 top-7 text-gray-300 group-focus-within:text-black transition-colors" size={18} />
                        <textarea
                          rows="3"
                          className="w-full pl-14 pr-6 py-5 rounded-3xl border border-gray-100 bg-gray-50/50 focus:bg-white focus:border-black outline-none transition-all font-bold text-sm resize-none"
                          value={profile.address}
                          onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                          placeholder={t("address")}
                        />
                      </div>
                    </div>

                    <div className="pt-8">
                      <button
                        disabled={updating}
                        className="w-full md:w-auto px-16 bg-black text-white py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] hover:bg-orange-600 transition-all disabled:bg-gray-400 disabled:cursor-not-allowed"
                      >
                        {updating ? t("loading") : t("save")}
                      </button>
                    </div>
                  </form>
                </motion.div>
              )}

            </AnimatePresence>
          )}
        </main>
      </div>
    </div>
  );
}

export default Profile;