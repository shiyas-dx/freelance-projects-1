import { useEffect, useState, useMemo, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import ProductCard from "../components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, ArrowRight, ChevronLeft, ChevronRight,
  Star, Instagram, Twitter, Truck, RotateCcw, ShieldCheck, Headphones,
  TrendingUp, Sparkles, Flame, Trophy, Crown, Snowflake, Timer
} from "lucide-react";

// Swiper
import { Swiper, SwiperSlide } from "swiper/react";
import { Autoplay, Pagination, EffectFade, Navigation, FreeMode } from "swiper/modules";
import "swiper/css";
import "swiper/css/pagination";
import "swiper/css/effect-fade";
import "swiper/css/navigation";
import "swiper/css/free-mode";

const PRODUCTS_PER_PAGE = 8;
const BASE_URL = "http://127.0.0.1:8000";

const getImageUrl = (path) => {
  if (!path) return "https://placehold.co/600x400?text=LUXE";
  return path;
};

/* ── Star Rating ─────────────────────────────── */
function StarRating({ rating = 5 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} size={14} className={i <= rating ? "text-orange-500 fill-orange-500" : "text-gray-300 fill-gray-300"} />
      ))}
    </div>
  );
}

/* ── Pagination ──────────────────────────────── */
function Pagination_({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <button onClick={() => onChange(current - 1)} disabled={current === 1}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white hover:border-black disabled:opacity-40 transition-colors">
        <ChevronLeft size={16} />
      </button>
      {pages.map((p) => (
        <button key={p} onClick={() => onChange(p)}
          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full text-xs sm:text-sm font-bold transition-all
            ${p === current ? "bg-black text-white border-black shadow" : "border border-gray-300 text-gray-700 hover:bg-black hover:text-white hover:border-black"}`}>
          {p}
        </button>
      ))}
      <button onClick={() => onChange(current + 1)} disabled={current === total}
        className="w-9 h-9 sm:w-10 sm:h-10 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white hover:border-black disabled:opacity-40 transition-colors">
        <ChevronRight size={16} />
      </button>
    </div>
  );
}

/* ── Trust Badge ─────────────────────────────── */
function TrustBadge({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-center gap-3 sm:gap-4 p-4 sm:p-5 rounded-2xl bg-white border border-gray-100 hover:shadow transition-shadow">
      <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-orange-50 flex items-center justify-center flex-shrink-0">
        <Icon size={18} className="text-orange-600" />
      </div>
      <div>
        <p className="text-[10px] sm:text-[11px] font-black uppercase tracking-wide text-gray-900">{title}</p>
        <p className="text-xs text-gray-500 font-medium mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

/* ── Live Countdown Timer ────────────────────── */
function Countdown({ targetHours = 8 }) {
  const [time, setTime] = useState({ h: targetHours, m: 0, s: 0 });
  useEffect(() => {
    const end = Date.now() + targetHours * 3600 * 1000;
    const tick = setInterval(() => {
      const diff = Math.max(0, end - Date.now());
      setTime({
        h: Math.floor(diff / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
        s: Math.floor((diff % 60000) / 1000),
      });
      if (diff === 0) clearInterval(tick);
    }, 1000);
    return () => clearInterval(tick);
  }, []);
  const pad = (n) => String(n).padStart(2, "0");
  return (
    <div className="flex items-center gap-1.5">
      {[pad(time.h), pad(time.m), pad(time.s)].map((val, i) => (
        <span key={i} className="flex items-center gap-1.5">
          <span className="bg-black/30 backdrop-blur-sm text-white font-black text-sm sm:text-base px-2.5 py-1.5 rounded-lg min-w-[2.5rem] text-center tabular-nums">{val}</span>
          {i < 2 && <span className="text-white/60 font-black">:</span>}
        </span>
      ))}
    </div>
  );
}

/* ── Promo skeleton strip ────────────────────── */
function PromoSkeleton({ count = 4, dark = false }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`aspect-square rounded-xl ${dark ? "bg-white/10" : "bg-gray-200"} animate-pulse`} />
      ))}
    </>
  );
}

/* ── Promo product swiper strip ──────────────────────────────────────────────
   Used inside Today's Sale and White Friday — horizontal swipeable row.
   Shows 4 at once; if more exist the user can drag to see them.
────────────────────────────────────────────────────────────────────────────── */
function PromoStrip({ products, loading, dark = false, onNavigate }) {
  if (loading) {
    return (
      <div className="grid grid-cols-4 gap-3">
        <PromoSkeleton count={4} dark={dark} />
      </div>
    );
  }
  if (!products.length) return null;

  return (
    <Swiper
      modules={[FreeMode, Autoplay]}
      freeMode={true}
      slidesPerView={4}
      spaceBetween={10}
      autoplay={products.length > 4 ? { delay: 2500, disableOnInteraction: false } : false}
      loop={products.length > 4}
      breakpoints={{
        0:   { slidesPerView: 3.2 },
        480: { slidesPerView: 4 },
      }}
      className="!overflow-visible promo-strip"
    >
      {products.map((p, i) => (
        <SwiperSlide key={p.id}>
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.06 }}
            onClick={() => onNavigate(`/product/${p.id}`)}
            className="cursor-pointer group"
          >
            <div className={`aspect-square rounded-xl overflow-hidden ${dark ? "bg-white/20 backdrop-blur-sm" : "bg-gray-100"}`}>
              <img
                src={getImageUrl(p.image)}
                alt={p.name}
                className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              />
            </div>
            <p className={`text-[9px] font-black mt-1.5 truncate uppercase ${dark ? "text-white" : "text-gray-900"}`}>
              ₹{p.price}
            </p>
          </motion.div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

/* ── Best Seller 2×2 grid swiper ─────────────────────────────────────────────
   Shows 4 products in a 2×2 grid per "page"; swipes to next 4 if more exist.
────────────────────────────────────────────────────────────────────────────── */
function BestSellerGrid({ products, loading, onNavigate }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <PromoSkeleton count={4} dark />
      </div>
    );
  }
  if (!products.length) {
    return <p className="col-span-2 text-gray-600 text-[10px] font-bold uppercase tracking-widest text-center py-4">No best sellers yet</p>;
  }

  // Group into chunks of 4 for grid-per-slide
  const chunks = [];
  for (let i = 0; i < products.length; i += 4) chunks.push(products.slice(i, i + 4));

  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      pagination={chunks.length > 1 ? { clickable: true, dynamicBullets: true } : false}
      autoplay={chunks.length > 1 ? { delay: 3000, disableOnInteraction: false } : false}
      loop={chunks.length > 1}
      className="best-seller-swiper w-full"
    >
      {chunks.map((chunk, ci) => (
        <SwiperSlide key={ci}>
          <div className={`grid grid-cols-2 gap-3 ${chunks.length > 1 ? "pb-8" : ""}`}>
            {chunk.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, scale: 0.92 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onNavigate(`/product/${p.id}`)}
                className="cursor-pointer group"
              >
                <div className="aspect-square rounded-xl overflow-hidden bg-gray-800 relative">
                  <img
                    src={getImageUrl(p.image)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-80 group-hover:opacity-100"
                  />
                  {ci === 0 && i === 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-amber-400 text-black text-[7px] font-black px-1.5 py-0.5 rounded-full">#1</div>
                  )}
                </div>
                <p className="text-white text-[9px] font-black mt-1.5 truncate uppercase">₹{p.price}</p>
              </motion.div>
            ))}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

/* ── New Arrivals 2×2 grid swiper ────────────────────────────────────────────
   Same chunk-per-slide approach on a light background.
────────────────────────────────────────────────────────────────────────────── */
function NewArrivalGrid({ products, loading, onNavigate }) {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <PromoSkeleton count={4} />
      </div>
    );
  }
  if (!products.length) {
    return <p className="col-span-2 text-gray-400 text-[10px] font-bold uppercase tracking-widest text-center py-4">No new arrivals yet</p>;
  }

  const chunks = [];
  for (let i = 0; i < products.length; i += 4) chunks.push(products.slice(i, i + 4));

  return (
    <Swiper
      modules={[Pagination, Autoplay]}
      pagination={chunks.length > 1 ? { clickable: true, dynamicBullets: true } : false}
      autoplay={chunks.length > 1 ? { delay: 3200, disableOnInteraction: false } : false}
      loop={chunks.length > 1}
      className="new-arrival-swiper w-full"
    >
      {chunks.map((chunk, ci) => (
        <SwiperSlide key={ci}>
          <div className={`grid grid-cols-2 gap-3 ${chunks.length > 1 ? "pb-8" : ""}`}>
            {chunk.map((p, i) => (
              <motion.div
                key={p.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.07 }}
                onClick={() => onNavigate(`/product/${p.id}`)}
                className="cursor-pointer group"
              >
                <div className="aspect-square rounded-2xl overflow-hidden bg-gray-200 relative">
                  <img
                    src={getImageUrl(p.image)}
                    alt={p.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute top-1.5 left-1.5 bg-black text-white text-[7px] font-black px-2 py-0.5 rounded-full">New</div>
                </div>
                <div className="mt-1.5">
                  <p className="text-gray-900 text-[9px] font-black truncate uppercase tracking-tight">{p.name}</p>
                  <p className="text-orange-600 text-[10px] font-black">₹{p.price}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </SwiperSlide>
      ))}
    </Swiper>
  );
}

/* ══ MAIN COMPONENT ══════════════════════════ */
function Home() {
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [slides,      setSlides]      = useState([]);
  const [reviews,     setReviews]     = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const [todaySaleProducts,   setTodaySaleProducts]   = useState([]);
  const [bestSellerProducts,  setBestSellerProducts]  = useState([]);
  const [premiumProduct,      setPremiumProduct]      = useState(null);
  const [newArrivalProducts,  setNewArrivalProducts]  = useState([]);
  const [whiteFridayProducts, setWhiteFridayProducts] = useState([]);
  const [promoLoading,        setPromoLoading]        = useState(true);

  const navigate           = useNavigate();
  const location           = useLocation();
  const productsSectionRef = useRef(null);

  const queryParams    = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const activeCategory = queryParams.get("category");

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const productQuery = location.search ? `products/${location.search}` : "products/";
        const [prodRes, catRes, slideRes, revRes] = await Promise.all([
          API.get(productQuery),
          API.get("categories/"),
          API.get("slides/"),
          API.get("reviews/?approved=true"),
        ]);
        setProducts(  prodRes.data  || []);
        setCategories(catRes.data   || []);
        setSlides(    slideRes.data || []);
        setReviews(   revRes.data   || []);
        setCurrentPage(1);
      } catch (err) {
        console.error("Error fetching homepage data:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [location.search]);

  useEffect(() => {
    const fetchPromo = async () => {
      setPromoLoading(true);
      try {
        const [saleRes, bestRes, premRes, newRes, wfRes] = await Promise.all([
          API.get("products/today-sale/"),
          API.get("products/best-sellers/"),
          API.get("products/premium-pick/"),
          API.get("products/new-arrivals/"),
          API.get("products/white-friday/"),
        ]);
        setTodaySaleProducts(  saleRes.data  || []);
        setBestSellerProducts( bestRes.data  || []);
        setPremiumProduct(    (premRes.data  || [])[0] || null);
        setNewArrivalProducts( newRes.data   || []);
        setWhiteFridayProducts(wfRes.data    || []);
      } catch (err) {
        console.error("Error fetching promo data:", err);
      } finally {
        setPromoLoading(false);
      }
    };
    fetchPromo();
  }, []);

  const totalPages        = Math.ceil(products.length / PRODUCTS_PER_PAGE);
  const paginatedProducts = products.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handlePageChange = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    productsSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (loading && products.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black gap-6">
        <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity }}
          className="text-white font-black tracking-widest uppercase text-2xl sm:text-3xl">
          LUXE<span className="text-orange-500">.</span>
        </motion.div>
        <div className="flex gap-3">
          {[0, 1, 2].map((i) => (
            <motion.div key={i} animate={{ scale: [1, 1.5, 1], opacity: [0.5, 1, 0.5] }}
              transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
              className="w-2 h-2 rounded-full bg-orange-500" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white min-h-screen overflow-x-hidden">

      {/* ══ HERO ══════════════════════════════════ */}
      <section className="relative h-[30dvh] min-h-[200px] sm:h-[80dvh] md:h-[85dvh] lg:h-[90dvh] bg-black overflow-hidden">
        <Swiper
          modules={[Autoplay, Pagination, EffectFade]} effect="fade"
          autoplay={{ delay: 5000, disableOnInteraction: false }}
          pagination={{ clickable: true }} loop={true}
          className="h-full [&_.swiper-pagination-bullet]:bg-white/60 [&_.swiper-pagination-bullet-active]:bg-orange-500 [&_.swiper-pagination-bullet-active]:w-5 [&_.swiper-pagination]:!bottom-6 sm:[&_.swiper-pagination]:!bottom-10"
        >
          {slides.map((slide, idx) => (
            <SwiperSlide key={idx}>
              <div className="relative w-full h-full">
                <img src={getImageUrl(slide.image)}
                  className="absolute inset-0 w-full h-full object-cover object-center sm:object-[center_25%] brightness-[0.92]"
                  style={{ animation: "kenburns 12s ease-in-out infinite alternate" }}
                  alt={slide.title || "Collection"} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent/20" />
                <div className="absolute inset-0 flex flex-col justify-end pb-14 sm:pb-20 md:pb-28 px-5 sm:px-8 md:px-16 lg:px-20 max-w-7xl mx-auto">
                  <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
                    className="flex items-center gap-3 mb-4 sm:mb-6">
                    <span className="w-8 h-0.5 bg-orange-500" />
                    <span className="text-orange-400 font-black tracking-widest uppercase text-[10px] sm:text-xs">{slide.subtitle || "New Arrival"}</span>
                  </motion.div>
                  <motion.h1 initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.8, delay: 0.3 }}
                    className="text-4xl xs:text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-black leading-tight mb-6 sm:mb-8 uppercase italic tracking-tight text-white max-w-4xl">
                    {slide.title}
                  </motion.h1>
                  <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.6, delay: 0.45 }}
                    className="flex flex-wrap gap-3 sm:gap-4">
                    <button onClick={() => navigate(slide.link_url || "/shop")}
                      className="group flex items-center gap-2 bg-white text-black px-6 py-3.5 sm:px-8 sm:py-4 rounded-full font-black uppercase text-xs sm:text-sm tracking-wider hover:bg-orange-600 hover:text-white transition-all shadow-lg active:scale-95">
                      Shop Now <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
                    </button>
                    <button onClick={() => navigate("/shop")}
                      className="px-6 py-3.5 sm:px-7 sm:py-4 border border-white/40 text-white/90 rounded-full font-black uppercase text-xs sm:text-sm tracking-wider hover:border-white hover:text-white transition active:scale-95">
                      View Collection
                    </button>
                  </motion.div>
                </div>
              </div>
            </SwiperSlide>
          ))}
        </Swiper>
        <style>{`
          @keyframes kenburns {
            0%   { transform: scale(1.04) translate(0,0); }
            100% { transform: scale(1.12) translate(-8px,-4px); }
          }
          /* Best seller pagination dots */
          .best-seller-swiper .swiper-pagination-bullet { background: #4b5563; opacity: 1; }
          .best-seller-swiper .swiper-pagination-bullet-active { background: #f59e0b !important; width: 20px; border-radius: 4px; }
          /* New arrival pagination dots */
          .new-arrival-swiper .swiper-pagination-bullet { background: #d1d5db; opacity: 1; }
          .new-arrival-swiper .swiper-pagination-bullet-active { background: #ea580c !important; width: 20px; border-radius: 4px; }
          /* Promo strip: hide scrollbar */
          .promo-strip { overflow: visible !important; }
        `}</style>
      </section>

      {/* ══ TRUST BADGES ══════════════════════════ */}
      <section className="bg-gray-50 py-10 sm:py-12 border-y border-gray-100">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            <TrustBadge icon={Truck}       title="Free Shipping"   subtitle="On orders over ₹999" />
            <TrustBadge icon={RotateCcw}   title="30-Day Returns"  subtitle="Hassle-free" />
            <TrustBadge icon={ShieldCheck} title="Secure Checkout" subtitle="Protected" />
            <TrustBadge icon={Headphones}  title="24/7 Support"    subtitle="We're here" />
          </div>
        </div>
      </section>

      {/* ══ CATEGORIES ════════════════════════════ */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 gap-6">
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <span className="w-6 h-0.5 bg-orange-500" />
              <span className="text-orange-600 font-black uppercase text-[10px] sm:text-xs tracking-wider">Explore</span>
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tight">Shop by Category</h2>
          </div>
          <div className="flex gap-3 self-end sm:self-auto">
            <button className="cat-prev w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white transition-colors active:scale-95">
              <ArrowLeft size={18} />
            </button>
            <button className="cat-next w-10 h-10 sm:w-12 sm:h-12 rounded-full border border-gray-300 flex items-center justify-center hover:bg-black hover:text-white transition-colors active:scale-95">
              <ArrowRight size={18} />
            </button>
          </div>
        </div>
        <Swiper modules={[Navigation]} navigation={{ nextEl: ".cat-next", prevEl: ".cat-prev" }}
          spaceBetween={12} slidesPerView={1.3}
          breakpoints={{ 480: { slidesPerView: 1.6, spaceBetween: 16 }, 640: { slidesPerView: 2.2, spaceBetween: 20 }, 768: { slidesPerView: 2.8, spaceBetween: 24 }, 1024: { slidesPerView: 3.4, spaceBetween: 28 } }}
          className="!overflow-visible pb-4">
          {categories.map((cat) => (
            <SwiperSlide key={cat.id}>
              <motion.div whileHover={{ y: -8, scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={() => navigate(`/shop?category=${cat.id}`)}
                className={`relative aspect-[4/5] sm:aspect-[3/4] rounded-2xl sm:rounded-3xl overflow-hidden cursor-pointer group border-2 transition-all duration-300
                  ${activeCategory == cat.id ? "border-orange-500 shadow-2xl scale-[1.02]" : "border-transparent hover:border-orange-300/70"}`}>
                <img src={getImageUrl(cat.image)} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" alt={cat.name} />
                <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent group-hover:from-black/85 transition-all" />
                {activeCategory == cat.id && (
                  <div className="absolute top-3 right-3 bg-orange-600 text-white text-[9px] sm:text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full shadow">Selected</div>
                )}
                <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
                  <h3 className="text-white text-xl sm:text-2xl md:text-3xl font-black uppercase italic tracking-tight drop-shadow-md">{cat.name}</h3>
                </div>
              </motion.div>
            </SwiperSlide>
          ))}
        </Swiper>
      </section>

      {/* ══ PROMO CARDS ═══════════════════════════ */}
      <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8 pb-16 sm:pb-20 space-y-6">

        {/* ── ROW 1: Today's Sale + Best Seller ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* TODAY'S SALE — strip swiper at bottom */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="md:col-span-3 relative overflow-hidden rounded-3xl bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 p-6 sm:p-8 min-h-[300px] flex flex-col justify-between">
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
              {[120,180,240,300,360].map((s,i) => (
                <div key={i} className="absolute rounded-full border-2 border-white/10"
                  style={{ width: s, height: s, top: "50%", right: -40, transform: "translateY(-50%)" }} />
              ))}
            </div>
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-3">
                <Flame size={17} className="text-white" />
                <span className="text-white/90 font-black uppercase text-[10px] tracking-[0.3em]">Limited Time</span>
              </div>
              <h3 className="text-3xl sm:text-5xl font-black uppercase italic tracking-tight text-white leading-none mb-2">Today's Sale</h3>
              <p className="text-white/80 font-bold text-sm mb-5">Up to 40% off on selected items</p>
              <div className="flex items-center gap-3 mb-6 flex-wrap">
                <Timer size={13} className="text-white/60 flex-shrink-0" />
                <span className="text-white/60 text-[10px] font-black uppercase tracking-widest">Ends in</span>
                <Countdown targetHours={8} />
              </div>
              <button onClick={() => navigate("/shop")}
                className="inline-flex items-center gap-2 bg-white text-orange-600 px-6 py-3 rounded-full font-black uppercase text-[10px] tracking-widest hover:bg-black hover:text-white transition-all active:scale-95 shadow-lg">
                Shop Sale <ArrowRight size={13} />
              </button>
            </div>
            {/* ── Swipeable product strip ── */}
            <div className="relative z-10 mt-6">
              <PromoStrip
                products={todaySaleProducts}
                loading={promoLoading}
                dark={true}
                onNavigate={navigate}
              />
              {!promoLoading && todaySaleProducts.length > 4 && (
                <p className="text-white/40 text-[9px] font-bold uppercase tracking-widest text-right mt-1.5">
                  swipe for more →
                </p>
              )}
            </div>
          </motion.div>

          {/* BEST SELLER — 2×2 grid swiper */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-2 relative overflow-hidden rounded-3xl bg-[#0a0a0a] p-6 sm:p-7 min-h-[300px] flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Trophy size={16} className="text-amber-400" />
              <span className="text-amber-400 font-black uppercase text-[10px] tracking-[0.3em]">Trending Now</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-white mb-1">Best Sellers</h3>
            <p className="text-gray-500 text-xs font-bold mb-4">Our most-loved pieces this week</p>
            <div className="flex-1">
              <BestSellerGrid
                products={bestSellerProducts}
                loading={promoLoading}
                onNavigate={navigate}
              />
            </div>
            <button onClick={() => navigate("/shop")}
              className="mt-4 w-full flex items-center justify-center gap-2 border border-gray-700 text-gray-300 hover:bg-white hover:text-black py-3 rounded-full font-black uppercase text-[10px] tracking-widest transition-all">
              View All <ArrowRight size={12} />
            </button>
          </motion.div>
        </div>

        {/* ── ROW 2: Premium Product Card ── */}
        <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.55 }}
          className="relative overflow-hidden rounded-3xl min-h-[220px] sm:min-h-[300px] md:min-h-[340px] cursor-pointer group"
          onClick={() => premiumProduct && navigate(`/product/${premiumProduct.id}`)}>
          {promoLoading ? (
            <div className="absolute inset-0 bg-gray-200 animate-pulse" />
          ) : premiumProduct ? (
            <img src={getImageUrl(premiumProduct.image)} alt="Premium"
              className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700" />
          ) : (
            <div className="absolute inset-0 bg-gray-900" />
          )}
          <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/50 to-transparent" />
          <div className="relative z-10 h-full flex flex-col justify-center px-8 sm:px-12 md:px-16 py-10">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={16} className="text-amber-400" />
              <span className="text-amber-400 font-black uppercase text-[10px] tracking-[0.35em]">Premium Pick</span>
            </div>
            <h3 className="text-3xl sm:text-4xl md:text-6xl font-black uppercase italic tracking-tight text-white leading-none mb-3 max-w-2xl">
              {premiumProduct?.name || "Signature Collection"}
            </h3>
            <p className="text-gray-300 font-bold text-sm mb-6 max-w-sm">Crafted for those who demand the finest. Limited quantities available.</p>
            <div className="flex items-center gap-4 flex-wrap">
              {premiumProduct && <span className="text-white font-black text-2xl">₹{premiumProduct.price}</span>}
              <div className="inline-flex items-center gap-2 bg-amber-400 text-black px-7 py-3 rounded-full font-black uppercase text-[10px] tracking-widest group-hover:bg-white transition-all shadow-xl">
                Shop Now <ArrowRight size={13} />
              </div>
            </div>
          </div>
          <div className="absolute top-5 right-5 bg-amber-400 text-black text-[9px] font-black uppercase px-4 py-2 rounded-full tracking-widest shadow-lg">
            ✦ Exclusive
          </div>
        </motion.div>

        {/* ── ROW 3: New Arrivals + White Friday Sale ── */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6">

          {/* NEW ARRIVALS — 2×2 grid swiper */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5 }}
            className="md:col-span-2 rounded-3xl bg-gray-50 border border-gray-100 p-6 sm:p-7 flex flex-col">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles size={16} className="text-orange-600" />
              <span className="text-orange-600 font-black uppercase text-[10px] tracking-[0.3em]">Just Dropped</span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-black uppercase italic tracking-tight text-gray-900 mb-1">New Arrivals</h3>
            <p className="text-gray-400 text-xs font-bold mb-4">Fresh styles added this week</p>
            <div className="flex-1">
              <NewArrivalGrid
                products={newArrivalProducts}
                loading={promoLoading}
                onNavigate={navigate}
              />
            </div>
            <button onClick={() => navigate("/shop")}
              className="mt-4 w-full flex items-center justify-center gap-2 bg-black text-white hover:bg-orange-600 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest transition-all active:scale-95">
              See All New Arrivals <ArrowRight size={12} />
            </button>
          </motion.div>

          {/* WHITE FRIDAY SALE — strip swiper at bottom */}
          <motion.div initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.5, delay: 0.1 }}
            className="md:col-span-3 relative overflow-hidden rounded-3xl bg-[#04080f] p-6 sm:p-8 flex flex-col justify-between min-h-[340px]">
            {[...Array(5)].map((_, i) => (
              <motion.div key={i} animate={{ y: [0, -18, 0], rotate: [0, 180, 360] }}
                transition={{ duration: 5 + i, repeat: Infinity, delay: i * 0.6 }}
                className="absolute text-white/5 pointer-events-none select-none"
                style={{ top: `${8 + i * 17}%`, right: `${6 + i * 7}%`, fontSize: `${28 + i * 8}px` }}>
                ❄
              </motion.div>
            ))}
            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-4">
                <Snowflake size={17} className="text-blue-400" />
                <span className="text-blue-400 font-black uppercase text-[10px] tracking-[0.3em]">Mega Event</span>
              </div>
              <h3 className="text-4xl sm:text-5xl md:text-6xl font-black uppercase italic tracking-tight leading-none mb-3">
                <span className="text-white">White</span><br />
                <span className="text-blue-400">Friday</span>
                <span className="text-orange-500"> Sale</span>
              </h3>
              <p className="text-gray-400 font-bold text-sm mb-6 max-w-xs">Our biggest sale of the year. Unmissable deals on premium fashion.</p>
              <div className="flex flex-wrap gap-2 mb-6">
                {["50% OFF", "FREE SHIP", "EXTRA 10%"].map((b) => (
                  <span key={b} className="bg-white/10 border border-white/15 text-white text-[9px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">{b}</span>
                ))}
              </div>
              <button onClick={() => navigate("/shop")}
                className="inline-flex items-center gap-2 bg-blue-500 hover:bg-blue-400 text-white px-8 py-3.5 rounded-full font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg">
                Explore Deals <ArrowRight size={13} />
              </button>
            </div>
            {/* ── Swipeable product strip ── */}
            <div className="relative z-10 mt-6">
              <PromoStrip
                products={whiteFridayProducts}
                loading={promoLoading}
                dark={true}
                onNavigate={navigate}
              />
              {!promoLoading && whiteFridayProducts.length > 4 && (
                <p className="text-blue-300/40 text-[9px] font-bold uppercase tracking-widest text-right mt-1.5">
                  swipe for more →
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>

      {/* ══ PRODUCTS ══════════════════════════════ */}
      <section ref={productsSectionRef} className="bg-black py-12 sm:py-16 md:py-20 lg:py-24 scroll-mt-16">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-10 sm:mb-14 gap-6">
            <div>
              <div className="flex items-center gap-2.5 mb-3">
                <span className="w-6 h-0.5 bg-orange-500" />
                <span className="text-orange-500 font-black uppercase text-xs tracking-wider flex items-center gap-2">
                  <TrendingUp size={14} /> Featured
                </span>
              </div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tight text-white">
                {activeCategory ? categories.find((c) => c.id == activeCategory)?.name || "Collection" : "Our Products"}
              </h2>
            </div>
            <div className="flex items-center gap-4 text-gray-400 text-xs sm:text-sm">
              <span className="font-medium">{products.length} items • Page {currentPage}/{totalPages || 1}</span>
              <button onClick={() => navigate("/shop")}
                className="flex items-center gap-2 border border-gray-700 text-gray-300 hover:bg-white hover:text-black px-4 py-2 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider transition-colors">
                View All <ArrowRight size={14} />
              </button>
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div key={currentPage} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} transition={{ duration: 0.4 }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5 lg:gap-6">
              {paginatedProducts.map((product, i) => (
                <motion.div key={product.id} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06, duration: 0.45 }}>
                  <ProductCard product={product} dark={true} />
                </motion.div>
              ))}
            </motion.div>
          </AnimatePresence>

          {products.length === 0 && !loading && (
            <div className="text-center py-20 text-gray-500">
              <Sparkles size={36} className="mx-auto mb-4 opacity-70" />
              <p className="font-medium uppercase tracking-wider text-sm">No products found</p>
            </div>
          )}

          {totalPages > 1 && (
            <div className="mt-12 sm:mt-16 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6 text-gray-400 text-xs sm:text-sm">
              <p>Showing {(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–{Math.min(currentPage * PRODUCTS_PER_PAGE, products.length)} of {products.length}</p>
              <Pagination_ current={currentPage} total={totalPages} onChange={handlePageChange} />
              <div className="flex gap-3">
                <button onClick={() => handlePageChange(currentPage - 1)} disabled={currentPage === 1}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-700 hover:bg-white hover:text-black disabled:opacity-40 transition-colors text-xs sm:text-sm font-black uppercase tracking-wider">
                  <ArrowLeft size={14} /> Prev
                </button>
                <button onClick={() => handlePageChange(currentPage + 1)} disabled={currentPage === totalPages}
                  className="flex items-center gap-2 px-5 py-2.5 bg-orange-600 border border-orange-600 text-white rounded-full hover:bg-orange-500 disabled:opacity-40 transition-colors text-xs sm:text-sm font-black uppercase tracking-wider">
                  Next <ArrowRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ REVIEWS ═══════════════════════════════ */}
      <section className="py-12 sm:py-16 md:py-20 lg:py-24 bg-white">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="text-center mb-10 sm:mb-16">
            <div className="flex items-center justify-center gap-3 mb-4">
              <span className="w-6 h-0.5 bg-orange-500" />
              <span className="text-orange-600 font-black uppercase text-xs tracking-wider">Testimonials</span>
              <span className="w-6 h-0.5 bg-orange-500" />
            </div>
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-black uppercase italic tracking-tight">What Our Customers Say</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
            {reviews.slice(0, 3).map((rev, i) => (
              <motion.div key={rev.id} initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1, duration: 0.6 }}
                className="p-6 sm:p-8 bg-white rounded-2xl border border-gray-100 hover:border-orange-200 hover:shadow-xl transition-all group flex flex-col">
                <StarRating rating={rev.rating} />
                <p className="mt-5 mb-6 flex-1 text-gray-800 leading-relaxed text-base">"{rev.comment}"</p>
                <div className="flex items-center gap-3 pt-5 border-t border-gray-100">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white font-black text-lg flex-shrink-0">
                    {rev.name?.[0]?.toUpperCase() || "?"}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{rev.name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Verified Buyer</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ NEWSLETTER ════════════════════════════ */}
      <section className="bg-orange-600 py-12 sm:py-16">
        <div className="max-w-2xl mx-auto px-5 sm:px-6 text-center">
          <h3 className="text-3xl sm:text-4xl font-black uppercase italic tracking-tight text-white mb-4">Exclusive Offers</h3>
          <p className="text-orange-100 font-medium text-base sm:text-lg mb-6 sm:mb-8">Join for early access, new drops & special discounts.</p>
          <form className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <input type="email" placeholder="Your email address" required
              className="flex-1 bg-white/15 border border-white/30 text-white placeholder-orange-200 rounded-full px-5 py-3.5 text-sm outline-none focus:bg-white/25 transition" />
            <button type="submit" className="bg-black text-white px-8 py-3.5 rounded-full text-xs sm:text-sm font-black uppercase tracking-wider hover:bg-white hover:text-black transition-all active:scale-95">
              Subscribe
            </button>
          </form>
        </div>
      </section>

      {/* ══ FOOTER ════════════════════════════════ */}
      <footer className="bg-black text-gray-300 pt-16 pb-10">
        <div className="max-w-7xl mx-auto px-5 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-10 md:gap-12 mb-16 pb-12 border-b border-white/10">
            <div className="md:col-span-2">
              <h2 className="text-4xl font-black italic text-white mb-4">LUXE<span className="text-orange-600">.</span></h2>
              <p className="text-gray-400 max-w-md text-sm leading-relaxed">Premium minimalist fashion • Redefining everyday luxury.</p>
              <div className="flex gap-4 mt-6">
                <button className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:border-white hover:text-white transition"><Instagram size={18} /></button>
                <button className="w-10 h-10 rounded-full border border-gray-700 flex items-center justify-center hover:border-white hover:text-white transition"><Twitter size={18} /></button>
              </div>
            </div>
            <div>
              <h4 className="font-black text-xs tracking-widest text-orange-600 mb-6 uppercase">Shop</h4>
              <ul className="space-y-3 text-sm">
                {["New Arrivals", "Best Sellers", "Sale", "Gift Cards"].map((item) => (
                  <li key={item}><button className="hover:text-white transition">{item}</button></li>
                ))}
              </ul>
            </div>
            <div>
              <h4 className="font-black text-xs tracking-widest text-orange-600 mb-6 uppercase">Support</h4>
              <ul className="space-y-3 text-sm">
                {["Shipping", "Returns", "Size Guide", "Contact Us"].map((item) => (
                  <li key={item}><button className="hover:text-white transition">{item}</button></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-xs uppercase tracking-wider text-gray-500">
            <p>© {new Date().getFullYear()} LUXE. All rights reserved.</p>
            <div className="flex gap-6">
              <button className="hover:text-gray-300 transition">Privacy</button>
              <button className="hover:text-gray-300 transition">Terms</button>
              <button className="hover:text-gray-300 transition">Cookies</button>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default Home;