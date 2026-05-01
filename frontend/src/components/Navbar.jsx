import { Link, useNavigate, useLocation } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useLang } from "../context/LangContext";   // ← uses your separate LangContext file
import { useState, useEffect, useRef } from "react";
import API from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Menu, Search, LogOut, X,
  ChevronDown, Zap, ArrowRight, Package,
  ArrowUpRight, User, ShoppingBag,
  Heart, Globe, Check,
} from "lucide-react";

/* ── helpers ─────────────────────────────────────────── */
const BASE_URL = "http://127.0.0.1:8000";

const getImageUrl = (path) => {
  if (!path) return "https://placehold.co/48x48?text=?";
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

function useDebounce(value, delay = 280) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function getUserInitials() {
  const name = localStorage.getItem("user_name") || "";
  return (
    name.split(" ").slice(0, 2).map((w) => w[0]?.toUpperCase() || "").join("") || "U"
  );
}
function getUserName()  { return localStorage.getItem("user_name")  || "User"; }
function getUserEmail() { return localStorage.getItem("user_email") || ""; }

/* ── NavLink ─────────────────────────────────────────── */
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

/* ── HighlightMatch ──────────────────────────────────── */
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

/* ── SearchDropdown ──────────────────────────────────── */
function SearchDropdown({ results, query, loading, onSelect, onViewAll, highlightIdx }) {
  const { t } = useLang();
  if (!query.trim()) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.98 }}
      transition={{ duration: 0.15 }}
      className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden z-50"
    >
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

      {!loading && results.length > 0 && (
        <>
          <div className="px-4 pt-3 pb-1">
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">
              {t("products")}
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
                    <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                      <img src={getImageUrl(product.image)} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-bold text-gray-900 truncate leading-tight
                        ${isHighlighted ? "text-orange-700" : "group-hover:text-orange-600"} transition-colors`}>
                        <HighlightMatch text={product.name} query={query} />
                      </p>
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5 truncate capitalize">
                        {product.category?.name || ""}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-sm font-black text-gray-900"><span class="font-semibold text-gray-700">QAR</span>{product.price}</p>
                      <p className="text-[10px] text-gray-300 line-through"><span class="font-semibold text-gray-700">QAR</span>{originalPrice}</p>
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
          <div className="px-4 py-3 border-t border-gray-50">
            <button
              onMouseDown={(e) => { e.preventDefault(); onViewAll(); }}
              className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-widest text-gray-500 hover:text-orange-600 transition-colors group py-1"
            >
              <span>{t("viewAllResults", { query })}</span>
              <ArrowRight size={13} className="group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>
        </>
      )}

      {!loading && results.length === 0 && (
        <div className="px-4 py-6 text-center">
          <Search size={22} className="text-gray-200 mx-auto mb-2" />
          <p className="text-sm font-black text-gray-500 uppercase tracking-tight">{t("noResults", { query })}</p>
          <p className="text-[11px] text-gray-400 font-bold mt-1">{t("tryOther")}</p>
        </div>
      )}
    </motion.div>
  );
}

/* ── SearchBox ───────────────────────────────────────── */
function SearchBox({ inputRef, isMobile = false, onDone }) {
  const navigate = useNavigate();
  const { t } = useLang();
  const [searchVal, setSearchVal] = useState("");
  const [results, setResults]     = useState([]);
  const [loading, setLoading]     = useState(false);
  const [open, setOpen]           = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(-1);
  const wrapperRef  = useRef(null);
  const debouncedQ  = useDebounce(searchVal, 280);

  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); setOpen(false); return; }
    setLoading(true);
    API.get(`products/?search=${encodeURIComponent(debouncedQ)}`)
      .then((res) => { setResults((res.data || []).slice(0, 7)); setOpen(true); })
      .catch(() => setResults([]))
      .finally(() => setLoading(false));
  }, [debouncedQ]);

  useEffect(() => {
    if (searchVal.trim()) setOpen(true); else setOpen(false);
    setHighlightIdx(-1);
  }, [searchVal]);

  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const commit = (path) => { setSearchVal(""); setOpen(false); navigate(path); onDone?.(); };

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlightIdx(p => Math.min(p + 1, results.length - 1)); }
    else if (e.key === "ArrowUp")  { e.preventDefault(); setHighlightIdx(p => Math.max(p - 1, -1)); }
    else if (e.key === "Enter") {
      if (highlightIdx >= 0 && results[highlightIdx]) commit(`/product/${results[highlightIdx].id}`);
      else if (searchVal.trim()) commit(`/shop?search=${searchVal.trim()}`);
    } else if (e.key === "Escape") setOpen(false);
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
        onChange={e => setSearchVal(e.target.value)}
        onKeyDown={handleKeyDown}
        onFocus={() => searchVal.trim() && setOpen(true)}
        placeholder={isMobile ? t("searchLong") : t("searchShort")}
        className={baseInput}
        autoComplete="off"
        dir="auto"
      />
      {searchVal && (
        <button
          onClick={() => { setSearchVal(""); setOpen(false); inputRef?.current?.focus(); }}
          className={`${isMobile ? "absolute right-4" : ""} text-gray-400 hover:text-gray-700 flex-shrink-0`}
        >
          <X size={isMobile ? 15 : 12} />
        </button>
      )}
      <AnimatePresence>
        {open && (
          <div className="absolute top-full left-0 right-0 mt-2">
            <SearchDropdown
              results={results}
              query={searchVal}
              loading={loading}
              highlightIdx={highlightIdx}
              onSelect={p => commit(`/product/${p.id}`)}
              onViewAll={() => commit(`/shop?search=${searchVal.trim()}`)}
            />
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── LanguageSwitcher ────────────────────────────────── */
// Reads LANGUAGES list directly from your LangContext so it stays in sync
function LanguageSwitcher() {
  const { lang, setLang, LANGUAGES } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const current = LANGUAGES.find(l => l.code === lang);

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-200 bg-gray-50 hover:bg-white hover:border-orange-300 hover:shadow-sm transition-all text-gray-700 group"
        title="Change language"
      >
        <Globe size={13} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
        <span className="text-[11px] font-black uppercase tracking-widest">{current.code.toUpperCase()}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={11} className="text-gray-400" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full mt-2 right-0 w-44 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden py-1.5 z-50"
          >
            <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 px-4 pt-1.5 pb-2">Language</p>
            {LANGUAGES.map(l => (
              <button
                key={l.code}
                onClick={() => { setLang(l.code); setOpen(false); }}
                className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                  ${lang === l.code ? "bg-orange-50 text-orange-700" : "hover:bg-gray-50 text-gray-700"}`}
              >
                <span className="text-lg leading-none">{l.flag}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-black uppercase tracking-wider">{l.label}</p>
                  <p className="text-[10px] text-gray-400 font-semibold">{l.native}</p>
                </div>
                {lang === l.code && <Check size={12} className="text-orange-500 flex-shrink-0" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── ProfileDropdown ─────────────────────────────────── */
function ProfileDropdown({ onLogout }) {
  const { t } = useLang();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const initials = getUserInitials();
  const name     = getUserName();
  const email    = getUserEmail();

  useEffect(() => {
    const handler = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const menuItems = [
    { to: "/profile",  icon: User,        label: t("profile")  },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(v => !v)}
        className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-all group
          ${open ? "bg-orange-50 border border-orange-200 shadow-sm" : "hover:bg-gray-100 border border-transparent"}`}
      >
        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black select-none transition-all
          ${open ? "bg-orange-500 text-white shadow-md shadow-orange-200" : "bg-orange-100 border-2 border-orange-200 text-orange-700 group-hover:border-orange-400"}`}>
          {initials}
        </div>
        <span className="hidden lg:block text-[11px] font-black uppercase tracking-widest text-gray-700 group-hover:text-orange-600 transition max-w-[80px] truncate">
          {name.split(" ")[0]}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronDown size={12} className="text-gray-400 group-hover:text-orange-500 transition-colors" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.97 }}
            transition={{ type: "spring", damping: 24, stiffness: 280 }}
            className="absolute top-full mt-3 right-0 w-64 bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden z-50"
          >
            {/* User hero */}
            <div className="px-5 py-4 bg-gradient-to-br from-orange-50 to-white border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-500 flex items-center justify-center text-sm font-black text-white shadow-md shadow-orange-200 flex-shrink-0">
                  {initials}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-black text-gray-900 truncate">{name}</p>
                  {email && <p className="text-[10px] text-gray-400 font-semibold truncate mt-0.5">{email}</p>}
                  <div className="flex items-center gap-1 mt-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600">
                      {t("active")}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              {menuItems.map(({ to, icon: Icon, label }) => (
                <Link
                  key={to}
                  to={to}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 px-5 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 transition-colors group"
                >
                  <div className="w-7 h-7 rounded-xl bg-gray-100 group-hover:bg-orange-100 flex items-center justify-center flex-shrink-0 transition-colors">
                    <Icon size={13} className="text-gray-500 group-hover:text-orange-500 transition-colors" />
                  </div>
                  {label}
                  <ArrowRight size={11} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity text-orange-400" />
                </Link>
              ))}
            </div>

            {/* Logout */}
            <div className="border-t border-gray-100 p-2">
              <button
                onClick={() => { setOpen(false); onLogout(); }}
                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[12px] font-bold text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors group"
              >
                <div className="w-7 h-7 rounded-xl bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center flex-shrink-0 transition-colors">
                  <LogOut size={13} className="text-rose-400" />
                </div>
                {t("logout")}
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ══ NAVBAR ══════════════════════════════════════════════ */
function Navbar() {
  const { cartCount } = useCart();
  const { t, isRTL } = useLang();
  const navigate = useNavigate();

  const [categories, setCategories]             = useState([]);
  const [isSearchOpen, setIsSearchOpen]         = useState(false);
  const [isMenuOpen, setIsMenuOpen]             = useState(false);
  const [isCatOpen, setIsCatOpen]               = useState(false);
  const [announcementVisible, setAnnouncementVisible] = useState(true);
  const [scrolled, setScrolled]                 = useState(false);

  const isLoggedIn     = !!localStorage.getItem("access_token");
  const mobileSearchRef = useRef(null);
  const catTimer        = useRef(null);

  useEffect(() => {
    API.get("categories/")
      .then(res => setCategories(res.data))
      .catch(err => console.error("Error fetching categories", err));

    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (isSearchOpen) setTimeout(() => mobileSearchRef.current?.focus(), 80);
  }, [isSearchOpen]);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      ["access_token", "refresh_token", "luxe_cart"].forEach(k => localStorage.removeItem(k));
      navigate("/login");
      window.location.reload();
    }
  };

  const openCat = () => { clearTimeout(catTimer.current); setIsCatOpen(true); };
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
            className="relative bg-black text-white overflow-hidden border-b border-white/5"
          >
            <div className="flex whitespace-nowrap py-2.5">
              <motion.div
                animate={{ x: isRTL ? ["0%", "50%"] : ["0%", "-50%"] }}
                transition={{ ease: "linear", duration: 15, repeat: Infinity }}
                className="flex items-center gap-12 pr-12 min-w-full"
              >
                {[...Array(12)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 text-[10px] font-black uppercase tracking-[0.2em] flex-shrink-0">
                    <Zap size={11} className="text-orange-500" />
                    <span>{t("freeShipping")}</span>
                    <span className="text-white/30 mx-4">·</span>
                  </div>
                ))}
              </motion.div>
            </div>
            <button
              onClick={() => setAnnouncementVisible(false)}
              className={`absolute ${isRTL ? "left-0" : "right-0"} top-0 bottom-0 px-4 bg-black/80 backdrop-blur-sm text-gray-400 hover:text-white transition z-10`}
            >
              <X size={12} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── MAIN NAV ── */}
      <nav className={`sticky top-0 z-[60] bg-white transition-shadow duration-300 ${scrolled ? "shadow-md" : "border-b border-gray-100"}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 sm:h-20 flex items-center justify-between gap-4">

          {/* Mobile hamburger */}
          <button
            onClick={() => setIsMenuOpen(true)}
            aria-label="Open menu"
            className="lg:hidden p-2 -ml-1 text-gray-900 hover:bg-gray-100 rounded-xl transition"
          >
            <Menu size={22} />
          </button>

          {/* Desktop nav links */}
          <div className="hidden lg:flex items-center gap-8">
            <NavLink to="/">{t("home")}</NavLink>
            <NavLink to="/shop">{t("shopAll")}</NavLink>

            {categories.length > 0 && (
              <div className="relative" onMouseEnter={openCat} onMouseLeave={closeCat}>
                <button className="flex items-center gap-1 text-[11px] font-black uppercase tracking-[0.2em] text-gray-900 hover:text-orange-600 transition">
                  {t("categories")}
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
                      {categories.map(cat => (
                        <Link
                          key={cat.id}
                          to={`/shop?category=${cat.id}`}
                          onClick={() => setIsCatOpen(false)}
                          className="flex items-center justify-between px-4 py-2.5 text-[12px] font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 capitalize transition group"
                        >
                          {cat.name}
                          <ArrowRight size={12} className={`opacity-0 group-hover:opacity-100 transition ${isRTL ? "rotate-180" : ""}`} />
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

          {/* Right controls */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Desktop search */}
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

            {/* Language switcher */}
            <div className="hidden sm:block">
              <LanguageSwitcher />
            </div>

            {/* Account */}
            <div className="hidden sm:flex items-center">
              {isLoggedIn ? (
                <ProfileDropdown onLogout={handleLogout} />
              ) : (
                <div className="flex items-center gap-2">
                  <Link to="/login" className="text-[10px] font-black uppercase tracking-widest px-4 py-2 text-gray-700 hover:text-orange-600 transition rounded-xl hover:bg-gray-100">
                    {t("login")}
                  </Link>
                  <Link to="/register" className="text-[10px] font-black uppercase tracking-widest bg-black text-white px-5 py-2.5 rounded-full hover:bg-orange-600 transition shadow-sm">
                    {t("join")}
                  </Link>
                </div>
              )}
            </div>

            {/* Cart */}
            <Link to="/cart" aria-label={t("cart")} className="relative p-2 group">
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

        {/* Mobile search overlay */}
        <AnimatePresence>
          {isSearchOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="md:hidden overflow-visible bg-white border-t border-gray-100 px-4 py-3"
            >
              <SearchBox inputRef={mobileSearchRef} isMobile={true} onDone={() => setIsSearchOpen(false)} />
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
              initial={{ x: isRTL ? "100%" : "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: isRTL ? "100%" : "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 220 }}
              className={`fixed top-0 ${isRTL ? "right-0" : "left-0"} bottom-0 w-[82%] max-w-[320px] bg-white z-[80] flex flex-col shadow-2xl`}
            >
              <div className="flex items-center justify-between px-6 py-5 border-b border-gray-100">
                <Link to="/" onClick={() => setIsMenuOpen(false)} className="text-xl font-black tracking-tighter uppercase">
                  LUXE<span className="text-orange-600">.</span>
                </Link>
                <div className="flex items-center gap-2">
                  <LanguageSwitcher />
                  <button onClick={() => setIsMenuOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto px-6 py-6 flex flex-col gap-6">
                {isLoggedIn && (
                  <Link
                    onClick={() => setIsMenuOpen(false)}
                    to="/profile"
                    className="flex items-center gap-4 p-4 bg-orange-50 rounded-2xl border border-orange-100 group"
                  >
                    <div className="w-11 h-11 rounded-full bg-orange-200 flex items-center justify-center text-sm font-black text-orange-800 select-none flex-shrink-0">
                      {getUserInitials()}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[9px] font-black uppercase tracking-widest text-orange-400">{t("welcomeBack")}</p>
                      <p className="text-sm font-black uppercase tracking-tight text-gray-900 group-hover:text-orange-700 transition">
                        {getUserName()}
                      </p>
                    </div>
                    <ArrowRight size={15} className={`ml-auto text-orange-400 flex-shrink-0 ${isRTL ? "rotate-180" : ""}`} />
                  </Link>
                )}

                <div className="flex flex-col gap-1">
                  {[{ to: "/", label: t("home") }, { to: "/shop", label: t("shopAll") }].map(({ to, label }) => (
                    <Link
                      key={to}
                      onClick={() => setIsMenuOpen(false)}
                      to={to}
                      className="text-xl font-black uppercase tracking-tight py-2 text-gray-900 hover:text-orange-600 transition flex items-center justify-between group"
                    >
                      {label}
                      <ArrowRight size={16} className={`opacity-0 group-hover:opacity-100 transition text-orange-500 ${isRTL ? "rotate-180" : ""}`} />
                    </Link>
                  ))}
                </div>

                {categories.length > 0 && (
                  <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.35em] text-gray-400 mb-3 flex items-center gap-2">
                      <Package size={10} /> {t("categories")}
                    </p>
                    <div className="flex flex-col gap-0.5">
                      {categories.map(cat => (
                        <Link
                          key={cat.id}
                          onClick={() => setIsMenuOpen(false)}
                          to={`/shop?category=${cat.id}`}
                          className="flex items-center justify-between px-3 py-2.5 text-sm font-bold text-gray-700 hover:bg-orange-50 hover:text-orange-600 capitalize transition rounded-xl group"
                        >
                          {cat.name}
                          <ArrowRight size={13} className={`opacity-0 group-hover:opacity-100 transition ${isRTL ? "rotate-180" : ""}`} />
                        </Link>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="px-6 py-5 border-t border-gray-100">
                {isLoggedIn ? (
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-3 text-red-500 hover:text-red-700 font-black uppercase text-[10px] tracking-widest transition py-1"
                  >
                    <LogOut size={15} /> {t("logout")}
                  </button>
                ) : (
                  <div className="flex flex-col gap-3">
                    <Link
                      onClick={() => setIsMenuOpen(false)}
                      to="/login"
                      className="text-center bg-gray-100 hover:bg-gray-200 py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-900 transition"
                    >
                      {t("login")}
                    </Link>
                    <Link
                      onClick={() => setIsMenuOpen(false)}
                      to="/register"
                      className="text-center bg-black hover:bg-orange-600 text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition"
                    >
                      {t("join")} LUXE.
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