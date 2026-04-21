import { useState, useEffect } from "react";
import { useCart } from "../context/CartContext";
import { useNavigate } from "react-router-dom";
import API from "../services/api";
import { motion, AnimatePresence } from "framer-motion";
import toast from "react-hot-toast";

// ── Custom Confirmation Modal ──────────────────────────────────────────────────
function ConfirmModal({ onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          onClick={onCancel}
        />

        {/* Card */}
        <motion.div
          className="relative bg-white rounded-3xl shadow-2xl p-8 w-full max-w-sm mx-4 text-center"
          initial={{ scale: 0.85, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.85, opacity: 0, y: 20 }}
          transition={{ type: "spring", stiffness: 300, damping: 25 }}
        >
          {/* Icon */}
          <div className="w-16 h-16 bg-orange-50 text-orange-500 rounded-full flex items-center justify-center mx-auto mb-5 text-3xl">
            🛍️
          </div>

          <h3 className="text-xl font-black uppercase italic tracking-tight mb-2">
            Confirm Order
          </h3>
          <p className="text-gray-500 text-sm font-medium mb-8">
            Ready to place your order? We'll start preparing it right away.
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 py-3 rounded-2xl border-2 border-gray-200 text-gray-600 font-black uppercase tracking-widest text-xs hover:border-gray-400 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              className="flex-1 py-3 rounded-2xl bg-black text-white font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all"
            >
              Place Order
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

// ── Checkout Page ──────────────────────────────────────────────────────────────
function Checkout() {
  const { cart, cartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [fetchingProfile, setFetchingProfile] = useState(true);
  const [isSuccess, setIsSuccess] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false); // ← controls our modal

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    address: "",
    city: "",
    zip: "",
  });

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const res = await API.get("profile/");
        setFormData({
          name: res.data.name || "",
          phone: res.data.phone || "",
          address: res.data.address || "",
          city: res.data.city || "",
          zip: "",
        });
      } catch (err) {
        console.error("Could not pre-fill profile:", err);
      } finally {
        setFetchingProfile(false);
      }
    };
    fetchProfileData();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Step 1: validate → show modal
  const handlePlaceOrder = (e) => {
    if (e) e.preventDefault();
    if (!formData.name || !formData.phone || !formData.address) {
      toast.error("Please fill in all required fields.");
      return;
    }
    if (loading || isSuccess) return;
    setShowConfirm(true); // open our custom modal
  };

  // Step 2: user clicked "Place Order" inside the modal
  const handleConfirmed = async () => {
    setShowConfirm(false);
    setLoading(true);
    const toastId = toast.loading("Processing your order...");

    try {
      const orderData = {
        ...formData,
        items: cart.map((item) => ({ product: item.id, quantity: item.quantity })),
        total_price: cartTotal,
      };

      const res = await API.post("orders/", orderData);

      if (res.status === 201 || res.status === 200) {
        toast.success("Order confirmed!", { id: toastId });
        clearCart(); // ← make sure CartContext's clearCart does NOT call window.confirm
        setIsSuccess(true);
        setTimeout(() => navigate("/"), 5000);
      } else {
        throw new Error("Server error");
      }
    } catch (err) {
      console.error("Order Error:", err);
      const errorMessage = err.response?.data?.detail || "Failed to place order.";
      toast.error(errorMessage, { id: toastId });
      setLoading(false);
    }
  };

  // Step 3: user clicked "Cancel" — just close modal, do nothing
  const handleCancelled = () => {
    setShowConfirm(false);
  };

  // ── Success screen ───────────────────────────────────────────────────────────
  if (isSuccess) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center text-center px-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6 text-4xl"
        >
          ✓
        </motion.div>
        <h2 className="text-4xl font-black mb-4 uppercase italic">Order Placed!</h2>
        <p className="text-gray-500 max-w-md mx-auto mb-8 font-medium">
          Thank you for your purchase. We've received your details and are preparing your package.
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-black text-white px-10 py-4 rounded-full font-black uppercase tracking-widest text-xs hover:bg-orange-600 transition-all"
        >
          Return to Shop
        </button>
      </div>
    );
  }

  if (cart.length === 0 && !isSuccess) {
    navigate("/cart");
    return null;
  }

  // ── Main checkout ────────────────────────────────────────────────────────────
  return (
    <>
      {/* Custom modal renders on top of everything */}
      {showConfirm && (
        <ConfirmModal onConfirm={handleConfirmed} onCancel={handleCancelled} />
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 md:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
            <div className="mb-8">
              <h2 className="text-4xl font-black uppercase italic tracking-tighter">
                Shipping<span className="text-orange-600">.</span>
              </h2>
            </div>

            <div
              className={`space-y-6 transition-opacity duration-500 ${
                fetchingProfile ? "opacity-50" : "opacity-100"
              }`}
            >
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Full Name
                  </label>
                  <input
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    type="text"
                    className="bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    type="tel"
                    className="bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                  Delivery Address
                </label>
                <textarea
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows="3"
                  className="bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    City
                  </label>
                  <input
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    type="text"
                    className="bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    ZIP Code
                  </label>
                  <input
                    name="zip"
                    value={formData.zip}
                    onChange={handleChange}
                    type="text"
                    className="bg-gray-50 border-none rounded-2xl p-4 font-bold text-sm"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={handlePlaceOrder}
                disabled={loading || fetchingProfile}
                className="w-full bg-black text-white py-6 rounded-3xl font-black uppercase tracking-[0.2em] text-xs hover:bg-orange-600 transition-all shadow-xl disabled:bg-gray-400"
              >
                {loading ? "Processing..." : "Confirm & Place Order"}
              </button>
            </div>
          </motion.div>

          {/* ORDER SUMMARY */}
          <div className="lg:pl-10">
            <div className="bg-gray-50 p-8 rounded-[3rem] border border-gray-100 sticky top-10">
              <h3 className="text-xl font-black uppercase italic mb-8 tracking-tight">
                Your Selection
              </h3>
              <div className="space-y-6 max-h-[400px] overflow-y-auto no-scrollbar pr-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="flex gap-4 items-center bg-white p-3 rounded-2xl shadow-sm"
                  >
                    <img
                      src={
                        item.image?.startsWith("http")
                          ? item.image
                          : `http://127.0.0.1:8000${item.image}`
                      }
                      className="w-16 h-16 object-cover rounded-xl"
                      alt={item.name}
                    />
                    <div className="flex-1">
                      <h4 className="text-xs font-black uppercase tracking-tighter text-gray-900">
                        {item.name}
                      </h4>
                      <p className="text-[10px] font-bold text-orange-600 uppercase">
                        Qty: {item.quantity}
                      </p>
                    </div>
                    <p className="font-black text-sm italic">₹{item.price * item.quantity}</p>
                  </div>
                ))}
              </div>
              <div className="mt-10 pt-8 border-t border-gray-200 space-y-4">
                <div className="flex justify-between items-end">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-[10px]">
                    Total Amount
                  </span>
                  <span className="text-4xl font-black text-gray-900 leading-none italic tracking-tighter">
                    ₹{cartTotal}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Checkout;