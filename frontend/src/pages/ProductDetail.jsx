import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import API from "../services/api";
import { useCart } from "../context/CartContext";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";
import {
  Star, ShoppingBag, Zap, ArrowLeft, ChevronRight,
  Truck, RotateCcw, ShieldCheck, Heart,
  CheckCircle2, Package, Clock, ChevronLeft
} from "lucide-react";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Navigation, Thumbs, FreeMode, Pagination, Autoplay } from "swiper/modules";
import "swiper/css";
import "swiper/css/navigation";
import "swiper/css/thumbs";
import "swiper/css/pagination";

/* ── Star display ─────────────────────────────── */
function StarRating({ rating = 5, size = 13 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          size={size}
          className={i <= rating ? "text-orange-500 fill-orange-500" : "text-gray-200 fill-gray-200"}
        />
      ))}
    </div>
  );
}

/* ── Interactive star picker ──────────────────── */
function StarPicker({ value, onChange }) {
  const [hovered, setHovered] = useState(0);
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          onMouseEnter={() => setHovered(n)}
          onMouseLeave={() => setHovered(0)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={24}
            className={
              n <= (hovered || value)
                ? "text-orange-500 fill-orange-500"
                : "text-gray-200 fill-gray-200"
            }
          />
        </button>
      ))}
    </div>
  );
}

/* ── Trust pill ───────────────────────────────── */
function TrustPill({ icon: Icon, text }) {
  return (
    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500">
      <Icon size={13} className="text-orange-500 flex-shrink-0" />
      {text}
    </div>
  );
}

/* ── Main ─────────────────────────────────────── */
function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const isLoggedIn = !!localStorage.getItem("access_token");

  const [product, setProduct]               = useState(null);
  const [reviews, setReviews]               = useState([]);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [newReview, setNewReview]           = useState({ name: "", rating: 5, comment: "" });
  const [showPopup, setShowPopup]           = useState(false);
  const [thumbsSwiper, setThumbsSwiper]     = useState(null);
  const [wishlisted, setWishlisted]         = useState(false);
  const [activeTab, setActiveTab]           = useState("reviews");
  const [qty, setQty]                       = useState(1);

  useEffect(() => {
    window.scrollTo(0, 0);
    setQty(1); // reset qty when product changes
    API.get(`products/${id}/`).then((r) => setProduct(r.data)).catch(() => toast.error("Product not found"));
    API.get(`reviews/?approved=true&product=${id}`).then((r) => setReviews(r.data));
    API.get(`products/`).then((r) => {
      setRelatedProducts(r.data.filter((p) => p.id !== parseInt(id)).slice(0, 12));
    });
  }, [id]);

  /* ── Loading ── */
  if (!product) return (
    <div className="h-screen flex flex-col items-center justify-center bg-white gap-5">
      <motion.div
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 1.8, repeat: Infinity }}
        className="text-2xl font-black uppercase tracking-[0.5em]"
      >
        LUXE<span className="text-orange-500">.</span>
      </motion.div>
      <div className="flex gap-2">
        {[0, 1, 2].map((i) => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18 }}
            className="w-1.5 h-1.5 rounded-full bg-orange-500"
          />
        ))}
      </div>
    </div>
  );

  const getImg        = (img) => img?.startsWith("http") ? img : `${IMAGE_BASE}${img}`;
  const allImages     = [product.image, ...(product.images?.map((i) => i.image) || [])];
  const originalPrice = (product.price * 1.2).toFixed(2);
  const savings       = (originalPrice - product.price).toFixed(2);
  const discountPct   = Math.round((savings / originalPrice) * 100);
  const addedDate     = new Date(product.created_at).toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" });
  const avgRating     = reviews.length
    ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";
  const inStock  = product.stock > 0;
  const lowStock = product.stock > 0 && product.stock < 10;

  /* ─────────────────────────────────────────────
     FIX: pass qty so CartContext adds the correct
     amount instead of always defaulting to 1.
  ───────────────────────────────────────────── */
  const handleAddToCart = () => {
    if (!isLoggedIn) { toast.error("Please login first"); navigate("/login"); return; }
    const ok = addToCart(product, qty);          // ← qty passed here
    if (ok !== false) {
      toast.success(`${qty > 1 ? `${qty}× ` : ""}${product.name} added to bag!`);
    }
  };

  const handleBuyNow = () => {
    if (!isLoggedIn) { toast.error("Please login to continue"); navigate("/login"); return; }
    const ok = addToCart(product, qty);           // ← qty passed here
    if (ok !== false) navigate("/cart");
  };

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post(`reviews/`, { ...newReview, product: id });
      setShowPopup(true);
      setNewReview({ name: "", rating: 5, comment: "" });
      setTimeout(() => setShowPopup(false), 3000);
      API.get(`reviews/?approved=true&product=${id}`).then((r) => setReviews(r.data));
    } catch { toast.error("Error submitting review."); }
  };

  return (
    <div className="bg-white min-h-screen">

      {/* ── SUCCESS TOAST ─────────────────────────── */}
      <AnimatePresence>
        {showPopup && (
          <motion.div
            initial={{ opacity: 0, y: 60, x: "-50%" }}
            animate={{ opacity: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, y: 60, x: "-50%" }}
            className="fixed bottom-8 left-1/2 z-[100] bg-black text-white px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 border border-orange-600"
          >
            <CheckCircle2 size={18} className="text-orange-500 flex-shrink-0" />
            <div>
              <p className="font-black uppercase text-[10px] tracking-widest">Review Submitted</p>
              <p className="text-gray-400 text-[10px] mt-0.5">Pending approval — thank you!</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BREADCRUMB ────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-2">
        <nav className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400">
          <button onClick={() => navigate("/")} className="hover:text-gray-700 transition">Home</button>
          <ChevronRight size={10} />
          <button onClick={() => navigate("/shop")} className="hover:text-gray-700 transition">Shop</button>
          <ChevronRight size={10} />
          <span className="text-gray-800 truncate max-w-[160px]">{product.name}</span>
        </nav>
      </div>

      {/* ── MAIN PRODUCT GRID ─────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 xl:gap-16">

          {/* LEFT: IMAGE GALLERY */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-gray-50 border border-gray-100 group">
              {/* Discount badge */}
              <div className="absolute top-5 left-5 z-10 bg-orange-600 text-white text-[10px] font-black px-3 py-1.5 rounded-full uppercase shadow-lg">
                -{discountPct}%
              </div>
              {/* Wishlist */}
              <button
                onClick={() => setWishlisted((w) => !w)}
                className="absolute top-5 right-5 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform"
              >
                <Heart size={16} className={wishlisted ? "fill-red-500 text-red-500" : "text-gray-400"} />
              </button>

              <Swiper
                loop={true}
                spaceBetween={0}
                navigation={{ nextEl: ".main-next", prevEl: ".main-prev" }}
                pagination={{ clickable: true }}
                thumbs={{ swiper: thumbsSwiper && !thumbsSwiper.destroyed ? thumbsSwiper : null }}
                modules={[FreeMode, Navigation, Thumbs, Pagination]}
                className="main-slider"
              >
                {allImages.map((img, idx) => (
                  <SwiperSlide key={idx}>
                    <div className="aspect-[4/5] overflow-hidden">
                      <img
                        src={getImg(img)}
                        alt="Product"
                        className="w-full h-full object-contain hover:scale-105 transition-transform duration-700"
                      />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>

              <button className="main-prev absolute left-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100">
                <ChevronLeft size={18} />
              </button>
              <button className="main-next absolute right-4 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-black hover:text-white transition-all opacity-0 group-hover:opacity-100">
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Thumbnails */}
            {allImages.length > 1 && (
              <Swiper
                onSwiper={setThumbsSwiper}
                spaceBetween={10}
                slidesPerView={5}
                freeMode={true}
                watchSlidesProgress={true}
                modules={[FreeMode, Thumbs]}
                breakpoints={{ 320: { slidesPerView: 4 }, 640: { slidesPerView: 5 } }}
              >
                {allImages.map((img, idx) => (
                  <SwiperSlide key={idx} className="cursor-pointer">
                    <div className="aspect-square rounded-2xl overflow-hidden border-2 border-transparent transition-all duration-300 thumb-slide">
                      <img src={getImg(img)} className="w-full h-full object-cover" alt="" />
                    </div>
                  </SwiperSlide>
                ))}
              </Swiper>
            )}

            {/* Trust pills */}
            <div className="flex flex-wrap gap-x-6 gap-y-3 pt-2 px-1">
              <TrustPill icon={Truck}       text="Free shipping ₹999+" />
              <TrustPill icon={RotateCcw}   text="30-day returns" />
              <TrustPill icon={ShieldCheck} text="Secure checkout" />
            </div>
          </div>

          {/* RIGHT: PRODUCT INFO */}
          <div className="flex flex-col">

            {product.category_name && (
              <span className="text-orange-600 font-black uppercase tracking-[0.3em] text-[10px] mb-3">
                {product.category_name}
              </span>
            )}

            <h1 className="text-4xl md:text-5xl font-black uppercase italic tracking-tighter leading-tight text-gray-900 mb-4">
              {product.name}
            </h1>

            {/* Rating row */}
            <div className="flex items-center gap-3 mb-6">
              <StarRating rating={Math.round(parseFloat(avgRating))} />
              <span className="text-sm font-black text-gray-800">{avgRating}</span>
              <span className="text-gray-300">·</span>
              <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">
                {reviews.length} {reviews.length === 1 ? "review" : "reviews"}
              </span>
            </div>

            {/* Price */}
            <div className="flex items-end gap-4 mb-6 pb-6 border-b border-gray-100">
              <span className="text-4xl font-black text-gray-900">₹{product.price}</span>
              <span className="text-xl text-gray-300 line-through font-bold mb-0.5">₹{originalPrice}</span>
              <span className="mb-1 bg-green-50 text-green-700 border border-green-100 text-[10px] font-black px-3 py-1.5 rounded-full uppercase">
                Save ₹{savings}
              </span>
            </div>

            {product.description && (
              <p className="text-gray-500 font-semibold text-sm leading-relaxed mb-6">
                {product.description}
              </p>
            )}

            {/* Stock badge */}
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl mb-6 w-fit
              ${!inStock ? "bg-red-50 text-red-600 border border-red-100"
                : lowStock ? "bg-amber-50 text-amber-700 border border-amber-100"
                : "bg-green-50 text-green-700 border border-green-100"}`}
            >
              <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-60
                  ${!inStock ? "bg-red-400" : lowStock ? "bg-amber-400" : "bg-green-400"}`} />
                <span className={`relative inline-flex rounded-full h-2.5 w-2.5
                  ${!inStock ? "bg-red-500" : lowStock ? "bg-amber-500" : "bg-green-500"}`} />
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest">
                {!inStock ? "Out of Stock"
                  : lowStock ? `Only ${product.stock} left — order soon`
                  : "In Stock & Ready to Ship"}
              </span>
            </div>

            {/* ── Quantity selector ──────────────────────
                This now directly controls how many units
                get added to the cart via handleAddToCart.
            ─────────────────────────────────────────── */}
            {inStock && (
              <div className="flex items-center gap-4 mb-6">
                <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Qty</span>
                <div className="flex items-center border border-gray-200 rounded-full overflow-hidden">
                  <button
                    onClick={() => setQty((q) => Math.max(1, q - 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-black text-lg"
                  >
                    −
                  </button>
                  <span className="w-10 text-center font-black text-sm">{qty}</span>
                  <button
                    onClick={() => setQty((q) => Math.min(product.stock, q + 1))}
                    className="w-10 h-10 flex items-center justify-center text-gray-500 hover:bg-gray-100 transition font-black text-lg"
                  >
                    +
                  </button>
                </div>
                <span className="text-[10px] text-gray-400 font-bold">{product.stock} available</span>
              </div>
            )}

            {/* ── Total preview when qty > 1 ── */}
            {inStock && qty > 1 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="flex items-center gap-2 mb-4 px-4 py-2.5 bg-orange-50 border border-orange-100 rounded-2xl w-fit"
              >
                <span className="text-[10px] font-black uppercase tracking-widest text-orange-600">
                  {qty} × ₹{product.price} = ₹{(product.price * qty).toFixed(2)}
                </span>
              </motion.div>
            )}

            {/* CTA buttons */}
            <div className="flex flex-col sm:flex-row gap-3 mb-8">
              <button
                onClick={handleAddToCart}
                disabled={!inStock}
                className="flex-1 flex items-center justify-center gap-2 bg-white text-black border-2 border-black py-5 rounded-full font-black uppercase tracking-[0.15em] text-[11px] hover:bg-black hover:text-white transition-all active:scale-95 shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ShoppingBag size={15} />
                Add {qty > 1 ? `${qty} to Bag` : "to Bag"}
              </button>
              <button
                onClick={handleBuyNow}
                disabled={!inStock}
                className="flex-1 flex items-center justify-center gap-2 bg-black text-white py-5 rounded-full font-black uppercase tracking-widest text-[11px] hover:bg-orange-600 transition-all active:scale-95 shadow-xl disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Zap size={15} />
                Buy {qty > 1 ? `${qty} Now` : "Now"}
              </button>
            </div>

            {/* Meta cards */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Package, label: "Status", value: inStock ? "Ready" : "Sold Out" },
                { icon: Clock,   label: "Added",  value: addedDate },
                { icon: Star,    label: "Rating", value: `${avgRating} / 5` },
              ].map(({ icon: Icon, label, value }) => (
                <div key={label} className="bg-gray-50 border border-gray-100 rounded-2xl p-4 text-center">
                  <Icon size={16} className="text-orange-500 mx-auto mb-2" />
                  <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-1">{label}</p>
                  <p className="text-xs font-black text-gray-800 leading-tight">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── TABS ──────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 mt-16">
        <div className="border-b border-gray-100 flex gap-8 mb-12">
          {["reviews", "details"].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`pb-4 text-[11px] font-black uppercase tracking-widest transition-all relative
                ${activeTab === tab ? "text-black" : "text-gray-400 hover:text-gray-700"}`}
            >
              {tab === "reviews" ? `Reviews (${reviews.length})` : "Product Details"}
              {activeTab === tab && (
                <motion.div layoutId="tab-indicator" className="absolute bottom-0 left-0 right-0 h-[2px] bg-orange-500 rounded-full" />
              )}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "reviews" ? (
            <motion.div
              key="reviews"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-3 gap-12 lg:gap-16 mb-20"
            >
              {/* Review form */}
              <div className="order-2 lg:order-1">
                <div className="sticky top-24">
                  <h3 className="text-2xl font-black uppercase italic tracking-tighter mb-1">Leave a Review</h3>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-8">Share your experience</p>
                  {isLoggedIn ? (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <input
                        type="text" placeholder="Your name" required
                        value={newReview.name}
                        onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all placeholder-gray-300"
                      />
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-3">Your rating</p>
                        <StarPicker value={newReview.rating} onChange={(n) => setNewReview({ ...newReview, rating: n })} />
                      </div>
                      <textarea
                        placeholder="Tell us what you think…" required rows="4"
                        value={newReview.comment}
                        onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                        className="w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-5 py-4 text-sm font-bold outline-none transition-all resize-none placeholder-gray-300"
                      />
                      <button className="w-full bg-black text-white py-4 rounded-full font-black uppercase text-[10px] tracking-[0.3em] hover:bg-orange-600 transition-all active:scale-95">
                        Post Review
                      </button>
                    </form>
                  ) : (
                    <div className="p-8 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200 text-center">
                      <Star size={28} className="text-gray-200 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 mb-6">Login to leave a review</p>
                      <Link to="/login" className="inline-block w-full py-3.5 bg-black text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all">
                        Login Now
                      </Link>
                    </div>
                  )}
                </div>
              </div>

              {/* Review list */}
              <div className="lg:col-span-2 order-1 lg:order-2">
                {reviews.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
                    <Star size={36} className="text-gray-100" />
                    <p className="font-black uppercase tracking-widest text-gray-300 text-sm">No reviews yet</p>
                    <p className="text-gray-400 text-xs font-bold">Be the first to share your thoughts</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {reviews.map((rev, i) => (
                      <motion.div
                        key={rev.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.06 }}
                        className="group p-6 rounded-3xl bg-gray-50 hover:bg-white border border-transparent hover:border-orange-100 hover:shadow-lg transition-all"
                      >
                        <StarRating rating={rev.rating} />
                        <p className="text-gray-700 font-bold text-sm italic leading-relaxed mt-4 mb-5">"{rev.comment}"</p>
                        <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-xs flex-shrink-0">
                            {rev.name?.[0]?.toUpperCase()}
                          </div>
                          <div>
                            <p className="font-black uppercase text-[10px] tracking-widest text-gray-800">{rev.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold mt-0.5">Verified Buyer</p>
                          </div>
                          <span className="ml-auto text-[9px] font-black uppercase tracking-widest text-orange-400 opacity-0 group-hover:opacity-100 transition-opacity bg-orange-50 px-2.5 py-1 rounded-full">✓</span>
                        </div>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="details"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.25 }}
              className="mb-20 max-w-2xl"
            >
              <div className="space-y-4">
                {[
                  { label: "Product Name", value: product.name },
                  { label: "Price",        value: `₹${product.price}` },
                  { label: "Stock",        value: `${product.stock} units` },
                  { label: "Added On",     value: addedDate },
                  { label: "Category",     value: product.category_name || "—" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex items-center justify-between py-4 border-b border-gray-100">
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{label}</span>
                    <span className="text-sm font-black text-gray-800">{value}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ── RELATED PRODUCTS ──────────────────────── */}
      <section className="border-t border-gray-100 py-16 md:py-24 bg-[#fafafa]">
        <div className="max-w-7xl mx-auto px-4 sm:px-8">
          <div className="flex items-end justify-between mb-12">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="w-5 h-[2px] bg-orange-500" />
                <span className="text-orange-600 font-black uppercase text-[10px] tracking-[0.3em]">Personalized</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-black uppercase italic tracking-tighter">You May Also Like</h2>
            </div>
            <button onClick={() => navigate("/shop")}
              className="hidden sm:flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-black transition">
              View All <ChevronRight size={13} />
            </button>
          </div>

          <Swiper
            modules={[Pagination, Navigation, Autoplay]}
            spaceBetween={16}
            slidesPerView={1.5}
            pagination={{ clickable: true, dynamicBullets: true }}
            autoplay={{ delay: 4000, disableOnInteraction: false }}
            breakpoints={{ 640: { slidesPerView: 2.2 }, 768: { slidesPerView: 3 }, 1024: { slidesPerView: 4 } }}
            className="related-swiper pb-14"
          >
            {(relatedProducts.length > 0 ? relatedProducts : Array(4).fill(null)).map((item, i) => (
              <SwiperSlide key={item?.id || i}>
                {item ? (
                  <Link to={`/product/${item.id}`} className="group block">
                    <div className="relative aspect-[3/4] rounded-3xl overflow-hidden bg-gray-100 border border-gray-100 transition-all duration-500 group-hover:shadow-xl group-hover:-translate-y-1.5">
                      <img src={getImg(item.image)} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" />
                      <div className="absolute top-3 left-3">
                        <span className="bg-orange-600 text-white text-[8px] font-black px-2.5 py-1 rounded-full uppercase shadow">
                          -{Math.round(((item.price * 1.2 - item.price) / (item.price * 1.2)) * 100)}%
                        </span>
                      </div>
                    </div>
                    <div className="mt-4 px-1">
                      <h4 className="font-black uppercase text-xs text-gray-900 group-hover:text-orange-600 transition-colors line-clamp-1 tracking-tight">{item.name}</h4>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="font-black text-sm text-gray-900">₹{item.price}</span>
                        <span className="text-[10px] text-gray-300 line-through font-bold">₹{(item.price * 1.2).toFixed(2)}</span>
                      </div>
                    </div>
                  </Link>
                ) : (
                  <div>
                    <div className="aspect-[3/4] rounded-3xl bg-gray-100 animate-pulse" />
                    <div className="mt-4 space-y-2">
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-3/4" />
                      <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
                    </div>
                  </div>
                )}
              </SwiperSlide>
            ))}
          </Swiper>
        </div>
      </section>

      <style>{`
        .main-slider .swiper-pagination-bullet { background: #000; opacity: 0.2; }
        .main-slider .swiper-pagination-bullet-active { background: #ea580c !important; opacity: 1; }
        .thumb-slide { opacity: 0.45; }
        .swiper-slide-thumb-active .thumb-slide { opacity: 1; border-color: #ea580c !important; transform: scale(1.04); box-shadow: 0 6px 12px rgba(234,88,12,0.2); }
        .related-swiper .swiper-pagination-bullet { width: 6px; height: 6px; background: #000; opacity: 0.15; transition: all 0.3s; }
        .related-swiper .swiper-pagination-bullet-active { background: #ea580c !important; width: 22px; border-radius: 4px; opacity: 1; }
      `}</style>
    </div>
  );
}

export default ProductDetail;