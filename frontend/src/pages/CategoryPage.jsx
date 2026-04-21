import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState, useRef } from "react";
import API from "../services/api";
import ProductCard from "../components/ProductCard";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, ArrowLeft, ArrowRight,
  SlidersHorizontal, Grid2X2, Grid3X3, Sparkles, X
} from "lucide-react";

const PRODUCTS_PER_PAGE = 8;
const BASE_URL = "http://127.0.0.1:8000";

const getImageUrl = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

const SORT_OPTIONS = [
  { label: "Latest", value: "latest" },
  { label: "Price: Low → High", value: "price_asc" },
  { label: "Price: High → Low", value: "price_desc" },
  { label: "Name A–Z", value: "name_asc" },
];

function sortProducts(products, sort) {
  const arr = [...products];
  if (sort === "price_asc") return arr.sort((a, b) => a.price - b.price);
  if (sort === "price_desc") return arr.sort((a, b) => b.price - a.price);
  if (sort === "name_asc") return arr.sort((a, b) => a.name.localeCompare(b.name));
  return arr; // latest = default API order
}

/* ── Pagination ─────────────────────────────────── */
function Pagination({ current, total, onChange }) {
  const pages = Array.from({ length: total }, (_, i) => i + 1);
  // Show at most 5 page buttons around current
  const visible = pages.filter(
    (p) => p === 1 || p === total || Math.abs(p - current) <= 1
  );
  const withEllipsis = [];
  visible.forEach((p, i) => {
    if (i > 0 && p - visible[i - 1] > 1) withEllipsis.push("…");
    withEllipsis.push(p);
  });

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={() => onChange(current - 1)}
        disabled={current === 1}
        className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronLeft size={15} />
      </button>

      {withEllipsis.map((p, i) =>
        p === "…" ? (
          <span key={`e${i}`} className="w-9 h-9 flex items-center justify-center text-gray-400 text-xs font-bold">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => onChange(p)}
            className={`w-9 h-9 rounded-full text-[11px] font-black transition-all
              ${p === current
                ? "bg-black text-white border-2 border-black scale-110 shadow-md"
                : "border border-gray-200 text-gray-600 hover:border-black hover:bg-black hover:text-white"
              }`}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => onChange(current + 1)}
        disabled={current === total}
        className="w-9 h-9 rounded-full border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
      >
        <ChevronRight size={15} />
      </button>
    </div>
  );
}

/* ── Main ───────────────────────────────────────── */
function CategoryPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [category, setCategory] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [sort, setSort] = useState("latest");
  const [gridCols, setGridCols] = useState(4);
  const [sortOpen, setSortOpen] = useState(false);

  const topRef = useRef(null);

useEffect(() => {
  if (!id) return;

  setLoading(true);
  setCurrentPage(1);
  
  Promise.all([
    API.get(`products/?category=${id}`),
    API.get(`categories/${id}/`).catch(() => ({ data: null })),
  ])
    .then(([prodRes, catRes]) => {
      setProducts(prodRes.data);
      setCategory(catRes.data);
    })
    .catch(console.error)
    .finally(() => setLoading(false));
}, [id]);

  const sorted = sortProducts(products, sort);
  const totalPages = Math.ceil(sorted.length / PRODUCTS_PER_PAGE);
  const paginated = sorted.slice(
    (currentPage - 1) * PRODUCTS_PER_PAGE,
    currentPage * PRODUCTS_PER_PAGE
  );

  const handlePageChange = (p) => {
    setCurrentPage(p);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        {/* Hero skeleton */}
        <div className="h-52 md:h-72 bg-gray-100 animate-pulse" />
        <div className="max-w-7xl mx-auto px-6 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="aspect-[3/4] rounded-2xl bg-gray-100 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white" ref={topRef}>

      {/* ── CATEGORY HERO ─────────────────────────────── */}
      <section className="relative h-52 md:h-80 overflow-hidden bg-[#0a0a0a]">
        {category?.image && (
          <img
            src={getImageUrl(category.image)}
            alt={category?.name}
            className="absolute inset-0 w-full h-full object-cover opacity-40"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent" />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          className="absolute top-6 left-6 flex items-center gap-2 text-white/70 hover:text-white text-[10px] font-black uppercase tracking-widest transition group"
        >
          <ArrowLeft size={14} className="group-hover:-translate-x-0.5 transition-transform" />
          Back
        </button>

        <div className="absolute inset-0 flex flex-col justify-end px-8 md:px-16 pb-10 max-w-7xl mx-auto left-0 right-0">
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 mb-3">
              <span className="w-5 h-[2px] bg-orange-500" />
              <span className="text-orange-400 font-black uppercase text-[10px] tracking-[0.35em]">
                Collection
              </span>
            </div>
            <h1 className="text-4xl md:text-6xl font-black uppercase italic tracking-tighter text-white leading-none capitalize">
              {category?.name || "Category"}
            </h1>
            <p className="text-gray-400 font-bold text-sm mt-3">
              {products.length} {products.length === 1 ? "product" : "products"}
            </p>
          </motion.div>
        </div>
      </section>

      {/* ── TOOLBAR ───────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">

          {/* Left: result count */}
          <p className="text-[11px] font-black uppercase tracking-widest text-gray-400 hidden sm:block">
            {products.length > 0
              ? `Showing ${(currentPage - 1) * PRODUCTS_PER_PAGE + 1}–${Math.min(currentPage * PRODUCTS_PER_PAGE, sorted.length)} of ${sorted.length}`
              : "No products"}
          </p>

          <div className="flex items-center gap-3 ml-auto">
            {/* Sort dropdown */}
            <div className="relative">
              <button
                onClick={() => setSortOpen((o) => !o)}
                className="flex items-center gap-2 border border-gray-200 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-700 hover:border-black transition"
              >
                <SlidersHorizontal size={12} />
                {SORT_OPTIONS.find((o) => o.value === sort)?.label}
              </button>

              <AnimatePresence>
                {sortOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setSortOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 6 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-52 bg-white rounded-2xl shadow-xl border border-gray-100 py-2 z-20"
                    >
                      {SORT_OPTIONS.map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setSort(opt.value); setCurrentPage(1); setSortOpen(false); }}
                          className={`w-full text-left px-4 py-2.5 text-[11px] font-black uppercase tracking-widest transition
                            ${sort === opt.value
                              ? "text-orange-600 bg-orange-50"
                              : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"}`}
                        >
                          {opt.value === sort && <span className="mr-2 text-orange-500">✓</span>}
                          {opt.label}
                        </button>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Grid toggle */}
            <div className="hidden sm:flex border border-gray-200 rounded-full p-1 gap-1">
              <button
                onClick={() => setGridCols(4)}
                className={`p-1.5 rounded-full transition ${gridCols === 4 ? "bg-black text-white" : "text-gray-400 hover:text-gray-700"}`}
              >
                <Grid3X3 size={14} />
              </button>
              <button
                onClick={() => setGridCols(2)}
                className={`p-1.5 rounded-full transition ${gridCols === 2 ? "bg-black text-white" : "text-gray-400 hover:text-gray-700"}`}
              >
                <Grid2X2 size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUCT GRID ──────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-6 py-10 md:py-14">

        {/* Empty state */}
        {products.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col items-center justify-center py-32 gap-5"
          >
            <div className="w-20 h-20 rounded-full bg-gray-100 flex items-center justify-center">
              <Sparkles size={32} className="text-gray-300" />
            </div>
            <div className="text-center">
              <p className="text-xl font-black uppercase italic tracking-tighter text-gray-800 mb-2">
                Nothing here yet
              </p>
              <p className="text-gray-400 font-bold text-sm">
                This category doesn't have any products yet.
              </p>
            </div>
            <button
              onClick={() => navigate("/shop")}
              className="flex items-center gap-2 bg-black text-white px-7 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition-all mt-2"
            >
              Browse All Products <ArrowRight size={12} />
            </button>
          </motion.div>
        )}

        {/* Grid */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentPage}-${sort}`}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
            className={`grid gap-4 md:gap-6
              ${gridCols === 4
                ? "grid-cols-2 md:grid-cols-3 lg:grid-cols-4"
                : "grid-cols-1 sm:grid-cols-2"
              }`}
          >
            {paginated.map((product, i) => (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35, delay: i * 0.04 }}
              >
                <ProductCard product={product} />
              </motion.div>
            ))}
          </motion.div>
        </AnimatePresence>

        {/* ── PAGINATION ────────────────────────────── */}
        {totalPages > 1 && (
          <div className="mt-16 pt-10 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
            <p className="text-[11px] font-bold uppercase tracking-widest text-gray-400">
              Page {currentPage} of {totalPages}
            </p>

            <Pagination
              current={currentPage}
              total={totalPages}
              onChange={handlePageChange}
            />

            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full border border-gray-200 text-gray-700 hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <ArrowLeft size={12} /> Prev
              </button>
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-orange-600 text-white hover:bg-orange-500 disabled:opacity-30 disabled:cursor-not-allowed text-[10px] font-black uppercase tracking-widest transition-all"
              >
                Next <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default CategoryPage;