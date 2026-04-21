import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate, useLocation } from "react-router-dom";
import Lenis from "lenis";
import { CartProvider } from "./context/CartContext";
import Layout from "./components/Layout";

// Client Pages
import Home from "./pages/Home";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import CategoryPage from "./pages/CategoryPage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Profile from "./pages/Profile";
import ShopPage from "./pages/ShopPage";
import ForgotPassword from "./pages/ForgotPassword";
import PasswordResetConfirm from "./pages/PasswordResetConfirm";

// Admin Pages
import AdminLayout from "./admin/AdminLayout";
import Dashboard from "./admin/Dashboard";
import ProductManagement from "./admin/ProductManagement";
import OrderManagement from "./admin/OrderManagement";
import OrderHistory from "./admin/OrderHistory";
import UserManagement from "./admin/UserManagement";

import { Toaster } from "react-hot-toast";

const ScrollManager = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    const requestID = requestAnimationFrame(raf);
    lenis.scrollTo(0, { immediate: true });
    return () => {
      cancelAnimationFrame(requestID);
      lenis.destroy();
    };
  }, [pathname]);
  return null;
};

const ProtectedRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("access_token");
  return isAuthenticated ? children : <Navigate to="/login" replace />;
};

const AdminRoute = ({ children }) => {
  const isAuthenticated = !!localStorage.getItem("access_token");
  const isStaff = localStorage.getItem("is_staff") === "true";
  return isAuthenticated && isStaff ? children : <Navigate to="/" replace />;
};

function App() {
  return (
    <CartProvider>
      <BrowserRouter>
        <ScrollManager />
        <Toaster position="bottom-center" />

        <Routes>
          {/* ── 1. AUTH PAGES (Standalone - No Navbar) ── */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/password-reset-confirm/:uid/:token" element={<PasswordResetConfirm />} />

          {/* ── 2. ADMIN PANEL (Isolated) ── */}
          <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
            <Route index element={<Dashboard />} />
            <Route path="products" element={<ProductManagement />} />
            <Route path="products/:id" element={<ProductDetail />} />
            <Route path="orders" element={<OrderManagement />} />
            <Route path="order-history" element={<OrderHistory />} />
            <Route path="users" element={<UserManagement />} />
          </Route>

          {/* ── 3. CLIENT WEBSITE (Wrapped in Layout with Navbar/Footer) ── */}
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="shop" element={<ShopPage />} />
            <Route path="product/:id" element={<ProductDetail />} />
            <Route path="category/:id" element={<CategoryPage />} />
            <Route path="cart" element={<ProtectedRoute><Cart /></ProtectedRoute>} />
            <Route path="checkout" element={<ProtectedRoute><Checkout /></ProtectedRoute>} />
            <Route path="profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          </Route>

          {/* Fallback for 404s */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </CartProvider>
  );
}

export default App;