import { useState, useEffect } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Menu,
  X,
  LogOut,
  Bell,
  ChevronRight,
  TrendingUp,
  Zap,
  Settings,
  History,
  Images,           // ← FIXED: Replaced 'Media' with 'Images'
  Clock,            // For OrderConfirmationQueue
} from "lucide-react";

const MENU = [
  { name: "Dashboard",              path: "/admin",                       icon: LayoutDashboard, accent: "text-violet-500",  bg: "bg-violet-50"  },
  { name: "Products",               path: "/admin/products",              icon: Package,         accent: "text-orange-500",  bg: "bg-orange-50"  },
  { name: "Confirmation Queue",     path: "/admin/confirmation-queue",    icon: Clock,           accent: "text-amber-500",   bg: "bg-amber-50"   },
  { name: "Orders",                 path: "/admin/orders",                icon: ShoppingCart,    accent: "text-blue-500",    bg: "bg-blue-50"    },
  { name: "Order History",          path: "/admin/order-history",         icon: History,         accent: "text-rose-500",    bg: "bg-rose-50"    },
  { name: "Users",                  path: "/admin/users",                 icon: Users,           accent: "text-emerald-500", bg: "bg-emerald-50" },
  { name: "Media",                  path: "/admin/media",                 icon: Images,          accent: "text-cyan-500",    bg: "bg-cyan-50"    },
];

{/* ── Breadcrumb Component ── */}
function Breadcrumb() {
  const { pathname } = useLocation();
  const parts = pathname.split("/").filter(Boolean);

  return (
    <nav className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-gray-400">
      {parts.map((part, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={10} />}
          <span className={i === parts.length - 1 ? "text-gray-700" : ""}>
            {part}
          </span>
        </span>
      ))}
    </nav>
  );
}

{/* ── Nav Item Component ── */}
function NavItem({ item, active, onClick }) {
  const Icon = item.icon;

  return (
    <Link
      to={item.path}
      onClick={onClick}
      className={`group relative flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200 font-bold text-sm
        ${active
          ? "bg-black text-white shadow-lg shadow-black/10"
          : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"}`}
    >
      <div
        className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 transition-all
          ${active ? "bg-white/15" : `${item.bg} ${item.accent}`}`}
      >
        <Icon size={16} className={active ? "text-white" : ""} />
      </div>
      <span className="truncate">{item.name}</span>
      {active && (
        <motion.div
          layoutId="active-pill"
          className="absolute right-3 w-1.5 h-1.5 rounded-full bg-orange-500"
        />
      )}
    </Link>
  );
}

/* ══ MAIN ADMIN LAYOUT ═══════════════════════════════════════════════ */
const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) =>
    path === "/admin"
      ? location.pathname === "/admin"
      : location.pathname.startsWith(path);

  const currentPage = MENU.find((m) => isActive(m.path))?.name || "Admin";

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Scroll shadow for header
  useEffect(() => {
    const el = document.getElementById("admin-main");
    if (!el) return;

    const handler = () => setScrolled(el.scrollTop > 8);
    el.addEventListener("scroll", handler, { passive: true });

    return () => el.removeEventListener("scroll", handler);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      ["access_token", "refresh_token"].forEach((k) => localStorage.removeItem(k));
      navigate("/login");
    }
  };

  /* Sidebar Content (shared) */
  const SidebarContent = () => (
    <div className="h-full flex flex-col">
      {/* Logo */}
      <div className="px-6 py-6 flex items-center justify-between">
        <Link to="/admin" className="flex items-center gap-2.5 select-none">
          <div className="w-8 h-8 rounded-xl bg-black flex items-center justify-center shadow-lg">
            <Zap size={16} className="text-orange-500" />
          </div>
          <div>
            <span className="text-base font-black uppercase tracking-tighter text-gray-900 leading-none block">
              LUXE<span className="text-orange-600">.</span>
            </span>
            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400 leading-none">
              Admin
            </span>
          </div>
        </Link>

        <button
          onClick={() => setSidebarOpen(false)}
          className="lg:hidden p-1.5 rounded-xl hover:bg-gray-100 text-gray-500 transition"
        >
          <X size={16} />
        </button>
      </div>

      {/* Section Label */}
      <div className="px-6 mb-2">
        <p className="text-[9px] font-black uppercase tracking-[0.3em] text-gray-400">Navigation</p>
      </div>

      {/* Navigation Links */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {MENU.map((item) => (
          <NavItem
            key={item.path}
            item={item}
            active={isActive(item.path)}
            onClick={() => setSidebarOpen(false)}
          />
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 space-y-2 border-t border-gray-100">
        <Link
          to="/"
          target="_blank"
          className="flex items-center gap-3 px-4 py-2.5 rounded-2xl text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition text-sm font-bold"
        >
          <div className="w-8 h-8 rounded-xl bg-gray-100 flex items-center justify-center">
            <TrendingUp size={15} className="text-gray-500" />
          </div>
          View Store
        </Link>

        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-red-500 hover:text-red-700 hover:bg-red-50 transition text-sm font-bold"
        >
          <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center">
            <LogOut size={15} className="text-red-500" />
          </div>
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 flex overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 flex-shrink-0 bg-white border-r border-gray-100 h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 240 }}
              className="fixed top-0 left-0 bottom-0 w-72 bg-white z-50 shadow-2xl lg:hidden"
            >
              <SidebarContent />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header
          className={`bg-white/90 backdrop-blur-md border-b border-gray-100 h-16 flex items-center justify-between px-4 sm:px-6 sticky top-0 z-30 transition-shadow duration-200
            ${scrolled ? "shadow-sm" : ""}`}
        >
          <div className="flex items-center gap-4">
            {/* Mobile Menu Button */}
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl hover:bg-gray-100 text-gray-600 transition"
            >
              <Menu size={20} />
            </button>

            {/* Breadcrumb + Title */}
            <div className="hidden sm:block">
              <Breadcrumb />
            </div>
            <h1 className="sm:hidden text-lg font-black uppercase tracking-tighter text-gray-900">
              {currentPage}
            </h1>
          </div>

          {/* Right Side Actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen((v) => !v)}
                className="relative p-2.5 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-gray-900 transition"
              >
                <Bell size={18} />
                <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
              </button>

              <AnimatePresence>
                {notifOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => setNotifOpen(false)} />
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 6, scale: 0.97 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden z-20"
                    >
                      <div className="px-4 py-3 border-b border-gray-50">
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                          Notifications
                        </p>
                      </div>

                      {[
                        { text: "New order #1042 placed", time: "2m ago", dot: "bg-blue-500" },
                        { text: "Product stock running low", time: "14m ago", dot: "bg-amber-500" },
                        { text: "New user registered", time: "1h ago", dot: "bg-emerald-500" },
                      ].map((n, i) => (
                        <div
                          key={i}
                          className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition cursor-pointer border-b border-gray-50 last:border-0"
                        >
                          <div className={`w-2 h-2 rounded-full ${n.dot} mt-1.5 flex-shrink-0`} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-800 leading-tight">{n.text}</p>
                            <p className="text-[10px] font-semibold text-gray-400 mt-0.5">{n.time}</p>
                          </div>
                        </div>
                      ))}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

            {/* Admin Profile */}
            <div className="flex items-center gap-2.5 pl-2 border-l border-gray-100 ml-1">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-400 to-orange-600 flex items-center justify-center text-white text-xs font-black shadow-sm">
                A
              </div>
              <div className="hidden sm:block">
                <p className="text-[11px] font-black uppercase tracking-widest text-gray-800 leading-none">
                  Admin
                </p>
                <p className="text-[9px] font-bold text-gray-400 mt-0.5 uppercase tracking-widest">
                  Super User
                </p>
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main id="admin-main" className="flex-1 overflow-y-auto overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;
