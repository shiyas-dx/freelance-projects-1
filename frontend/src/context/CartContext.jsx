import { createContext, useContext, useState, useEffect } from "react";
// Removed IMAGE_BASE from here
import API from "../services/api"; 

const CartContext = createContext();

export const CartProvider = ({ children }) => {

  const [cart, setCart] = useState(() => {
    const savedCart = localStorage.getItem("luxe_cart");
    return savedCart ? JSON.parse(savedCart) : [];
  });

  const [showToast, setShowToast] = useState(false);
  const [lastAdded, setLastAdded] = useState(null);

  useEffect(() => {
    localStorage.setItem("luxe_cart", JSON.stringify(cart));
  }, [cart]);

  const addToCart = (product, qty = 1) => {
    const token = localStorage.getItem("access_token");
    if (!token) return false;

    setCart((prev) => {
      const exists = prev.find((item) => item.id === product.id);
      if (exists) {
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + qty }
            : item
        );
      }
      return [...prev, { ...product, quantity: qty }];
    });

    setLastAdded({ ...product, addedQty: qty });
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
    return true;
  };

  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id, amount) => {
    if (amount < 1) return removeFromCart(id);
    setCart((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, quantity: amount } : item
      )
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const cartCount = cart.reduce((total, item) => total + item.quantity, 0);
  const cartTotal = cart.reduce((total, item) => total + item.price * item.quantity, 0);

  // UPDATED: Now simply returns the image string directly from Cloudinary
  const getToastImage = (img) => {
    if (!img) return "https://placehold.co/100x100?text=LUXE";
    return img; 
  };

  return (
    <CartContext.Provider value={{
      cart, addToCart, removeFromCart, updateQuantity, clearCart,
      cartCount, cartTotal, showToast, lastAdded,
    }}>
      {children}

      {/* ── TOAST NOTIFICATION ── */}
      {showToast && lastAdded && (
        <div className="fixed top-24 right-4 left-4 sm:left-auto sm:w-80 z-[100] bg-white border border-gray-100 shadow-2xl rounded-2xl p-4 flex items-center gap-4 animate-slide-in">
          <div className="w-12 h-12 flex-shrink-0">
            <img
              src={getToastImage(lastAdded.image)}
              className="w-full h-full object-cover rounded-lg bg-gray-50"
              alt=""
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-orange-600 uppercase tracking-widest">
              {lastAdded.addedQty > 1 ? `${lastAdded.addedQty}× Added to Bag` : "Added to Bag"}
            </p>
            <p className="text-sm font-bold text-gray-900 truncate">{lastAdded.name}</p>
          </div>
          <div className="text-green-500 bg-green-50 w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-check text-xs"></i>
          </div>
        </div>
      )}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);