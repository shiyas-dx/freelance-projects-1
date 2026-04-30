import { useCart } from "../context/CartContext";
import { useLang } from "../context/LangContext";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Minus, X, ShoppingBag, ArrowRight, Tag,
  Truck, RotateCcw, ShieldCheck, ChevronRight, Trash2, ArrowLeft
} from "lucide-react";
import { useState } from "react";

const VALID_CODES = { LUXE10: 10, SAVE20: 20, FIRST15: 15 };
const IMAGE_BASE = "http://127.0.0.1:8000";

function TrustItem({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
      <Icon size={13} className="text-orange-500 flex-shrink-0" />
      {text}
    </div>
  );
}

function EmptyCart() {
  const { t } = useLang();
  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center"
    >
      <div className="relative mb-8">
        <div className="w-28 h-28 bg-gray-50 border border-gray-100 rounded-full flex items-center justify-center">
          <ShoppingBag size={40} className="text-gray-200" />
        </div>
        <motion.div
          animate={{ scale: [1, 1.15, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="absolute -top-1 -right-1 w-7 h-7 bg-orange-500 rounded-full flex items-center justify-center text-white text-[10px] font-black"
        >
          0
        </motion.div>
      </div>
      <h2 className="text-4xl font-black uppercase italic tracking-tighter text-gray-900 mb-3">
        {t("emptyCart")}
      </h2>
      <p className="text-gray-400 font-bold text-sm max-w-xs leading-relaxed mb-10">
        {t("noData")}
      </p>
      <Link
        to="/shop"
        className="group flex items-center gap-3 bg-black text-white px-10 py-4 rounded-full font-black uppercase text-[11px] tracking-widest hover:bg-orange-600 transition-all shadow-xl active:scale-95"
      >
        {t("continueShopping")}
        <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
      </Link>
    </motion.div>
  );
}

function Cart() {
  const { t } = useLang();
  const { cart, removeFromCart, updateQuantity, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();

  const [promoInput,   setPromoInput]   = useState("");
  const [appliedCode,  setAppliedCode]  = useState(null);
  const [promoError,   setPromoError]   = useState("");
  const [promoSuccess, setPromoSuccess] = useState("");

  if (cart.length === 0) return <EmptyCart />;

  const discount       = appliedCode ? VALID_CODES[appliedCode] : 0;
  const discountAmount = ((cartTotal * discount) / 100).toFixed(2);
  const finalTotal     = (cartTotal - discountAmount).toFixed(2);

  const handlePromo = () => {
    const code = promoInput.trim().toUpperCase();
    if (VALID_CODES[code]) {
      setAppliedCode(code);
      setPromoSuccess(`${VALID_CODES[code]}% discount applied!`);
      setPromoError("");
    } else {
      setPromoError("Invalid promo code. Try LUXE10.");
      setPromoSuccess("");
    }
  };

  const removePromo = () => {
    setAppliedCode(null);
    setPromoInput("");
    setPromoSuccess("");
    setPromoError("");
  };

  const getImg = (img) => img?.startsWith("http") ? img : `${IMAGE_BASE}${img}`;

  return (
    <div className="min-h-screen bg-gray-50">

      {/* ── HEADER ─────────────────────────────── */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate(-1)}
              className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black transition-all group"
            >
              <ArrowLeft size={15} className="group-hover:text-white text-gray-600" />
            </button>
            <div>
              <h1 className="text-3xl font-black uppercase italic tracking-tighter text-gray-900 leading-none">
                {t("yourCart")}
              </h1>
              <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">
                {cart.length} {cart.length === 1 ? "item" : "items"} ·{" "}
                {cart.reduce((s, i) => s + i.quantity, 0)} units total
              </p>
            </div>
          </div>
          <button
            onClick={clearCart}
            className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition-colors group"
          >
            <Trash2 size={12} className="group-hover:text-red-500 transition-colors" />
            {t("clear")}
          </button>
        </div>
      </div>

      {/* ── BODY ───────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 xl:gap-12 items-start">

          {/* ── CART ITEMS ── */}
          <div className="lg:col-span-2 space-y-4">
            <AnimatePresence mode="popLayout">
              {cart.map((item, i) => (
                <motion.div
                  key={item.id}
                  layout
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -30, scale: 0.97 }}
                  transition={{ duration: 0.28, delay: i * 0.04 }}
                  className="group bg-white rounded-3xl border border-gray-100 hover:border-orange-100 hover:shadow-lg transition-all duration-300 overflow-hidden"
                >
                  <div className="flex gap-4 sm:gap-5 p-4 sm:p-5">
                    {/* Image */}
                    <Link to={`/product/${item.id}`} className="relative flex-shrink-0 w-24 h-32 sm:w-36 sm:h-44 rounded-2xl overflow-hidden bg-gray-50 block">
                      <img
                        src={getImg(item.image)}
                        alt={item.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </Link>

                    {/* Info */}
                    <div className="flex flex-col justify-between flex-1 py-0.5 min-w-0">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <Link to={`/product/${item.id}`}>
                            <h3 className="font-black uppercase italic tracking-tighter text-gray-900 text-base sm:text-xl leading-tight hover:text-orange-600 transition-colors line-clamp-2">
                              {item.name}
                            </h3>
                          </Link>
                          <button
                            onClick={() => removeFromCart(item.id)}
                            className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-500 hover:bg-red-50 transition-all mt-0.5"
                          >
                            <X size={14} />
                          </button>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                          <span className="text-orange-600 font-black text-lg">₹{item.price}</span>
                          <span className="text-[10px] text-gray-300 line-through font-bold">
                            ₹{(item.price * 1.2).toFixed(2)}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-2 mt-2">
                          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 bg-gray-50 border border-gray-100 px-2.5 py-1 rounded-full">
                            Size: Standard
                          </span>
                          <span className="text-[9px] font-black uppercase tracking-widest text-green-600 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                            {t("freeShipping")}
                          </span>
                        </div>
                      </div>

                      {/* Bottom: qty stepper + line total */}
                      <div className="flex items-center justify-between mt-4">
                        <div className="flex items-center bg-gray-50 border border-gray-100 rounded-full p-1 gap-1">
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-500"
                          >
                            <Minus size={11} />
                          </button>
                          <span className="w-8 text-center text-xs font-black text-gray-900">
                            {item.quantity}
                          </span>
                          <button
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                            className="w-7 h-7 flex items-center justify-center rounded-full hover:bg-white hover:shadow-sm transition-all text-gray-500"
                          >
                            <Plus size={11} />
                          </button>
                        </div>

                        <div className="text-right">
                          <p className="text-[9px] font-black uppercase tracking-widest text-gray-400">{t("subtotal")}</p>
                          <motion.p
                            key={item.quantity}
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="font-black text-gray-900 text-base"
                          >
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </motion.p>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            <Link
              to="/shop"
              className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black transition-colors mt-2 group"
            >
              <ArrowLeft size={12} className="group-hover:-translate-x-0.5 transition-transform" />
              {t("continueShopping")}
            </Link>
          </div>

          {/* ── ORDER SUMMARY ── */}
          <div className="lg:col-span-1">
            <div className="bg-[#0a0a0a] text-white rounded-3xl overflow-hidden sticky top-24 shadow-2xl">

              <div className="px-7 pt-7 pb-5 border-b border-white/10">
                <h2 className="text-xl font-black uppercase italic tracking-tighter">{t("orderSummary")}</h2>
                <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mt-1">
                  {cart.length} {cart.length === 1 ? "item" : "items"} · {t("freeShipping")}
                </p>
              </div>

              <div className="px-7 py-6 space-y-4">

                {/* Line items */}
                {cart.map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-xl overflow-hidden bg-gray-800 flex-shrink-0">
                        <img src={getImg(item.image)} alt={item.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-[11px] font-bold text-gray-300 truncate">{item.name}</p>
                        <p className="text-[9px] text-gray-500 mt-0.5">×{item.quantity} unit{item.quantity > 1 ? "s" : ""}</p>
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-[11px] font-black text-white">
                        ₹{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  </div>
                ))}

                <div className="h-px bg-white/10 my-2" />

                {/* Promo code */}
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-500 mb-3 flex items-center gap-2">
                    <Tag size={11} className="text-orange-500" /> Promo Code
                  </p>
                  {appliedCode ? (
                    <div className="flex items-center justify-between bg-green-500/10 border border-green-500/20 rounded-2xl px-4 py-3">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-green-400">{appliedCode}</p>
                        <p className="text-[9px] text-green-400/70 mt-0.5">{discount}% off applied</p>
                      </div>
                      <button onClick={removePromo} className="text-gray-500 hover:text-white transition">
                        <X size={14} />
                      </button>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={promoInput}
                        onChange={(e) => { setPromoInput(e.target.value); setPromoError(""); }}
                        onKeyDown={(e) => e.key === "Enter" && handlePromo()}
                        placeholder="Enter code…"
                        className="flex-1 bg-white/5 border border-white/10 focus:border-orange-500 rounded-xl px-4 py-2.5 text-xs font-bold text-white placeholder-gray-600 outline-none transition-all"
                      />
                      <button
                        onClick={handlePromo}
                        className="bg-orange-600 hover:bg-orange-500 text-white px-4 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all active:scale-95"
                      >
                        {t("confirm")}
                      </button>
                    </div>
                  )}
                  {promoError && <p className="text-[10px] text-red-400 font-bold mt-2">{promoError}</p>}
                </div>

                <div className="h-px bg-white/10" />

                {/* Totals */}
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">{t("subtotal")}</span>
                    <span className="text-white font-black">₹{cartTotal}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">Shipping</span>
                    <span className="text-green-400 font-black text-[10px] uppercase tracking-widest">{t("freeShipping")}</span>
                  </div>
                  {appliedCode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      className="flex justify-between text-sm"
                    >
                      <span className="text-green-400 font-bold">Discount ({discount}%)</span>
                      <span className="text-green-400 font-black">−₹{discountAmount}</span>
                    </motion.div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500 font-bold">Tax</span>
                    <span className="text-white font-black">Included</span>
                  </div>
                </div>

                <div className="h-px bg-white/10" />

                {/* Grand total */}
                <div className="flex justify-between items-end pt-1">
                  <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">{t("price")}</span>
                  <div className="text-right">
                    <motion.span
                      key={finalTotal}
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="text-3xl font-black text-white block leading-none"
                    >
                      ₹{finalTotal}
                    </motion.span>
                    {appliedCode && (
                      <p className="text-[9px] text-green-400 font-bold mt-1">You saved ₹{discountAmount}!</p>
                    )}
                  </div>
                </div>

                <Link to="/checkout">
                  <button className="w-full mt-2 bg-white text-black py-4 rounded-2xl font-black uppercase text-[11px] tracking-widest hover:bg-orange-500 hover:text-white transition-all active:scale-95 shadow-xl flex items-center justify-center gap-2 group">
                    {t("checkout")}
                    <ChevronRight size={14} className="group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </Link>

                <div className="flex flex-col gap-2.5 pt-2">
                  <TrustItem icon={ShieldCheck} text="256-bit SSL encryption" />
                  <TrustItem icon={Truck}       text={t("freeShipping")} />
                  <TrustItem icon={RotateCcw}   text="30-day hassle-free returns" />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}

export default Cart;