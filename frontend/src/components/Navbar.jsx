import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useState, useEffect, useRef, useCallback } from "react";
import API from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Menu, Search, LogOut, X,
  ChevronDown, Zap, ArrowRight, Package,
  TrendingUp, Clock, ArrowUpRight
} from "lucide-react";

const BASE_URL = "http://127.0.0.1:8000";

const getImageUrl = (path) => {
  if (!path) return "https://placehold.co/48x48?text=?";
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

/* ── debounce ─────────────────────────────────────────── */
function useDebounce(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

/* ── user initials ────────────────────────────────────── */
function getUserInitials() {
  const name = localStorage.getItem("user_name") || "";
  return (
    name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "U"
  );
}

/* ── active nav link ──────────────────────────────────── */
function NavLink({ to, children, onClick }) {
  const { pathname } = useLocation();
  const active = pathname === to;
  return (
    <Link
      to={to}
      onClick={onClick}
      className={`relative text-[11px] font-black uppercase tracking-[0.2em] transition-colors duration-200
        ${active ? "text-orange-600" : "text-gray-900 hover:text-orange-600"}`}
    >
      {children}
      {active && (
        <span className="absolute -bottom-1 left-0 right-0 h-[2px] bg-orange-600 rounded-full" />
      )}
    </Link>
  );
}

/* ── search dropdown ──────────────────────────────────── */
function SearchDropdown({ results, query, loading, onSelect, onViewAll, highlightIdx }) {
  if (!query.trim()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
    >
      {/* Loading shimmer */}
      {loading && (
        <div className="px-4 py-3 space-y-2.5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="flex items-center gap-3 animate-pulse">
              <div className="w-10 h-10 rounded-xl bg-gray-100 flex-shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-gray-100 rounded w-3/4" />
                <div className="h-2.5 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
              Products
            </p>
          </div>
          <ul>
            {results.map((product, i) => {
              const originalPrice = (product.price * 1.2).toFixed(0);
              const isHighlighted = i === highlightIdx;
              return (
                <li key={product.id}>
                  <button
                    onMouseDown={(e) => { e.preventDefault(); onSelect(product); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 transition-colors text-left group
                      ${isHighlighted ? "bg-orange-50" : "hover:bg-gray-50"}`}
                  >
                    {/* Product image */}
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                      <img
                        src={getImageUrl(product.image)}
                        alt={product.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    {/* Name + category */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-gray-900 truncate leading-tight
                        ${isHighlighted ? "text-orange-700" : "group-hover:text-orange-600"} transition-colors`}>
                        {/* Highlight matching text */}
                        <HighlightMatch text={product.name} query={query} />
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5 truncate capitalize">
                        {product.category?.name || ""}
                      </p>
                    </div>

                    {/* Price */}
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-black text-gray-900">₹{product.price}</p>
                      <p className="text-[10px] text-gray-300 line-through">₹{originalPrice}</p>
                    </div>

                    <ArrowUpRight
                      size={13}
                      className={`flex-shrink-0 transition-opacity ${isHighlighted ? "opacity-100 text-orange-500" : "opacity-0 group-hover:opacity-100 text-gray-400"}`}
                    />
                  </button>
                </li>
              );
            })}
          </ul>

          {/* View all results */}
          <div className="px-4 py-3 border-t border-gray-50">
            <button
              onMouseDown={(e) => { e.preventDefault(); onViewAll(); }}
              className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-600 transition-colors group py-1"
            >
              <span>View all results for "{query}"</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </>
      )}

      {/* Empty state */}
      {!loading && results.length === 0 && (
        <div className="px-4 py-6 text-center">
          <Search size={22} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-black text-gray-500 uppercase tracking-tight">No results for "{query}"</p>
          <p className="text-[11px] text-gray-400 font-bold mt-1">Try a different search term</p>
        </div>
      )}
    </motion.div>
  );
}

/* ── highlight matching substring ────────────────────── */
function HighlightMatch({ text, query }) {
  if (!query.trim()) return <>{text}</>;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <span className="text-orange-600 font-black">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

/* ── SearchBox (reused for desktop + mobile) ────────────
   Fully self-contained: manages its own dropdown state,
   keyboard navigation, and outside-click detection.
──────────────────────────────────────────────────────── */
function SearchBox({ inputRef, isMobile = false, onDone }) {
  const navigate = useNavigate();
  const [searchVal,    setSearchVal]    = useState("");
  const [results,      setResults]      = useState([]);
  const [loading,      setLoading]      = useState(false);
  const [open,         setOpen]         = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef = useRef(null);
  const debouncedQ = useDebounce(searchVal, 280);

  /* Fetch results when debounced query changes */
  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    API.get(`products/?search=${encodeURIComponent(debouncedQ)}`)
      .then((res) => {
        setResults((res.data || []).slice(0, 7));
        setOpen(true);
      })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  /* Show dropdown when typing */
  useEffect(() => {
    if (searchVal.trim()) setOpen(true);
    else setOpen(false);
    setHighlightIdx(-1);
  }, [searchVal]);

  /* Outside click closes dropdown */
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commit = (path) => {
    setSearchVal("");
    setOpen(false);
    navigate(path);
    onDone?.();
  };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlightIdx((p) => Math.min(p + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlightIdx((p) => Math.max(p - 1, -1));
    } else if (e.key === "Enter") {
      if (highlightIdx >= 0 && results[highlightIdx]) {
        commit(`/product/${results[highlightIdx].id}`);
      } else if (searchVal.trim()) {
        commit(`/shop?search=${searchVal.trim()}`);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const baseInput = isMobile
    ? "w-full bg-transparent border-none outline-none pl-11 pr-10 py-3.5 text-sm text-gray-900 placeholder-gray-400 font-semibold"
    : "bg-transparent border-none outline-none text-gray-900 text-xs px-2.5 w-full placeholder-gray-400 font-semibold";

  const baseWrapper = isMobile
    ? "relative flex items-center bg-gray-50 border border-gray-200 rounded-2xl overflow-visible focus-within:border-orange-400 transition"
    : "relative flex items-center bg-gray-50 rounded-full px-4 py-2 group border border-gray-200 focus-within:border-orange-400 focus-within:bg-white transition-all duration-200 w-36 lg:w-56";

  return (
    <div ref={wrapperRef} className={`${baseWrapper} relative`}>
      <Search size={isMobile ? 16 : 13} className={`${isMobile ? "absolute left-4" : ""} text-gray-400 flex-shrink-0`} />
      <input
        ref={inputRef}
        type="text"
        value={searchVal}
        onChange={(e) => setSearchVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchVal.trim() && setOpen(true)}
        placeholder={isMobile ? "Find your style…" : "Search…"}
        className={baseInput}
        autoComplete="off"
      />
      {searchVal && (
        <button
          onClick={() => { setSearchVal(""); setOpen(false); inputRef?.current?.focus(); }}
          className={`${isMobile ? "absolute right-4" : ""} text-gray-400 hover:text-gray-700 flex-shrink-0`}
        >
          <X size={isMobile ? 15 : 12} />
        </button>
      )}

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <div className={`absolute ${isMobile ? "top-full left-0 right-0 mt-2" : "top-full left-0 right-0 mt-2"}`}>
            <SearchDropdown
              results={results}
              query={searchVal}
              loading={loading}
              highlightIdx={highlightIdx}
              onSelect={(p) => commit(`/product/${p.id}`)}
              onViewAll={() => commit(`/shop?search=${searchVal.trim()}`)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══ NAVBAR ══════════════════════════════════════════════ */
function Navbar() {
  const { cartCount } = useCart();
  const navigate = useNavigate();

  const [categories,           setCategories]           = useState([]);
  const [isSearchOpen,         setIsSearchOpen]         = useState(false);
  const [isMenuOpen,           setIsMenuOpen]           = useState(false);
  const [isCatOpen,            setIsCatOpen]            = useState(false);
  const [announcementVisible,  setAnnouncementVisible]  = useState(true);
  const [scrolled,             setScrolled]             = useState(false);

  const isLoggedIn   = !!localStorage.getItem("access_token");
  const mobileSearchRef = useRef(null);
  const catTimer        = useRef(null);

  useEffect(() => {
    API.get("categories/")
      .then((res) => setCategories(res.data))
      .catch((err) => console.error("Error fetching categories", err));

    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) setTimeout(() => mobileSearchRef.current?.focus(), 80);
  }, [isSearchOpen]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      ["access_token", "refresh_token", "luxe_cart"].forEach((k) =>
        localStorage.removeItem(k)
      );
      navigate("/login");
      window.location.reload();
    }
  };

  const openCat  = () => { clearTimeout(catTimer.current); setIsCatOpen(true); };
  const closeCat = () => { catTimer.current = setTimeout(() => setIsCatOpen(false), 150); };

  return (
    <>
      {/* ── ANNOUNCEMENT BAR ── */}
      <AnimatePresence>
        {announcementVisible && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative bg-black text-white overflow-hidden"
          >
            <div className="flex items-center justify-center gap-3 py-2 px-4 text-[10px] font-black uppercase tracking-[0.2em]">
              <Zap size={11} className="text-orange-500 flex-shrink-0" />
              <span>Free shipping on orders over ₹999 · Use code <span className="text-orange-400">LUXE10</span> for 10% off</span>
            </div>
            <button
              onClick={() => setAnnouncementVisible(false)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white transition p-1"
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN NAV ── */}
      <nav className={`sticky top-0 z-[60] bg-white transition-shadow duration-300
        ${scrolled ? "shadow-md" : "border-b border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-1 text-gray-900 hover:bg-gray-100 rounded-xl transition"
          >
            <Menu size={22} />
          </button>

          {/* Desktop nav */}
          <div className="hidden lg:flex items-center gap-8">
            <NavLink to="/">Home</NavLink>
            <NavLink to="/shop">Shop All</NavLink>

            {categories.length > 0 && (
              <div className="relative" onMouseEnter={openCat} onMouseLeave={closeCat}>
                <button className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 hover:text-orange-600 transition">
                  Categories
                  <motion.span animate={{ rotate: isCatOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
                    <ChevronDown size={13} />
                  </motion.span>
                </button>
                <AnimatePresence>
                  {isCatOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 8 }}
                      transition={{ duration: 0.18 }}
                      className="absolute top-full left-1/2 -translate-x-1/2 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-2"
                    >
                      {categories.map((cat) => (
                        <Link
                          key={cat.id}
                          to={`/shop?category=${cat.id}`}
                          onClick={() => setIsCatOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 capitalize transition group"
                        >
                          {cat.name}
                          <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            )}
          </div>

          {/* Logo */}
          <Link to="/" className="absolute left-1/2 -translate-x-1/2 flex flex-col items-center select-none">
            <span className="text-2xl sm:text-[26px] font-black tracking-tighter text-black uppercase leading-none">
              LUXE<span className="text-orange-600">.</span>
            </span>
            <span className="hidden sm:block text-[7px] tracking-[0.4em] text-gray-400 uppercase mt-0.5 font-bold">
              Premium Style
            </span>
          </Link>

          {/* Right: search · account · cart */}
          <div className="flex items-center gap-1 sm:gap-2">

            {/* Desktop search with dropdown */}
            <div className="hidden md:block">
              <SearchBox onDone={() => {}} />
            </div>

            {/* Mobile search toggle */}
            <button
              onClick={() => setIsSearchOpen(!isSearchOpen)}
              aria-label="Search"
              className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-xl transition"
            >
              <Search size={20} />
            </button>

            {/* Desktop account */}
            <div className="hidden sm:flex items-center">
              {isLoggedIn ? (
                <div className="flex items-center gap-1">
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-gray-100 transition group"
                  >
                    <div className="w-7 h-7 rounded-full bg-orange-100 border-2 border-orange-300 flex items-center justify-center text-[9px] font-black text-orange-700 select-none">
                      {getUserInitials()}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest hidden lg:block text-gray-700 group-hover:text-orange-600 transition">
                      Profile
                    </span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    title="Logout"
                    className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition"
                  >
                    <LogOut size={16} />
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="text-[10px] font-black uppercase tracking-widest px-4 py-2 text-gray-700 hover:text-orange-600 transition rounded-xl hover:bg-gray-100">
                    Login
                  </Link>
                  <Link to="/register" className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition shadow-sm">
                    Join
                  </Link>
                </div>
              )}
            </div>

            {/* Cart */}
            <Link to="/cart" aria-label="Cart" className="relative p-2 group">
              <ShoppingCart size={21} className="text-gray-800 group-hover:text-orange-600 transition-colors duration-200" />
              <AnimatePresence>
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    className="absolute -top-0.5 -right-0.5 bg-orange-600 text-white text-[9px] font-black min-w-[18px] min-h-[18px] flex items-center justify-center rounded-full border-2 border-white shadow-sm px-1"
                  >
                    {cartCount > 99 ? "99+" : cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          </div>
        </div>

        {/* Mobile search overlay with dropdown */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-visible bg-white border-t border-gray-100 px-4 py-3"
            >
              <SearchBox
                inputRef={mobileSearchRef}
                isMobile={true}
                onDone={() => setIsSearchOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </nav>

      {/* ── MOBILE SIDEBAR ── */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="fixed inset-0 bg-black/50 backdrop-blur-[2px] z-[70]"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className="fixed top-0 left-0 bottom-0 w-[82%] max-w-[320px] bg-white z-[80] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-black tracking-tighter uppercase">
                  LUXE<span className="text-orange-600">.</span>
                </Link>
                <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
                  <X size={18} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
                {isLoggedIn && (
                  <Link onClick={() => setIsMenuOpen(false)} to="/profile"
                    className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 group">
                    <div className="w-11 h-11 rounded-full bg-orange-200 flex items-center justify-center text-sm font-black text-orange-800 select-none flex-shrink-0">
                      {getUserInitials()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-400">Welcome back</p>
                      <p className="text-sm font-black uppercase tracking-tight text-gray-900 group-hover:text-orange-700 transition">View Profile</p>
                    </div>
                    <ArrowRight size={15} className="ml-auto text-orange-400 flex-shrink-0" />
                  </Link>
                )}

                <div className="flex flex-col gap-1">
                  {[{ to: "/", label: "Home" }, { to: "/shop", label: "Shop All" }].map(({ to, label }) => (
                    <Link key={to} onClick={() => setIsMenuOpen(false)} to={to}
                      className="text-xl font-black uppercase tracking-tight py-2 text-gray-900 hover:text-orange-600 transition flex items-center justify-between group">
                      {label}
                      <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 transition text-orange-500" />
                    </Link>
                  ))}
                </div>

                {categories.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-gray-400 mb-3 flex items-center gap-2">
                      <Package size={10} /> Categories
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {categories.map((cat) => (
                        <Link key={cat.id} onClick={() => setIsMenuOpen(false)} to={`/shop?category=${cat.id}`}
                          className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 capitalize transition rounded-xl group">
                          {cat.name}
                          <ArrowRight size={13} className="opacity-0 group-hover:opacity-100 transition" />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-5 border-t border-gray-100">
                {isLoggedIn ? (
                  <button onClick={handleLogout} className="flex items-center gap-3 text-red-500 hover:text-red-700 font-black uppercase text-[10px] tracking-widest transition py-1">
                    <LogOut size={15} /> Logout
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link onClick={() => setIsMenuOpen(false)} to="/login"
                      className="text-center bg-gray-100 hover:bg-gray-200 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900 transition">
                      Login
                    </Link>
                    <Link onClick={() => setIsMenuOpen(false)} to="/register"
                      className="text-center bg-black hover:bg-orange-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition">
                      Join LUXE.
                    </Link>
                  </div>
                )}
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default Navbar;