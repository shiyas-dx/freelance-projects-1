import { useNavigate, Link } from "react-router-dom";
import { useCart } from "../context/CartContext";
// Removed IMAGE_BASE import as it's no longer needed for Cloudinary
import toast from "react-hot-toast";

function ProductCard({ product }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  
  // CLEANED UP: Just use product.image directly. 
  // The serializer ensures this is always the full URL.
  const imageUrl = product.image;

  const handleQuickAdd = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const success = addToCart(product);
    
    if (!success) {
      toast.error("Please login to add items to your bag");
      navigate("/login");
      return;
    }

    const btn = e.currentTarget;
    btn.style.transform = "scale(0.95)";
    setTimeout(() => { btn.style.transform = "scale(1)"; }, 100);
  };

  return (
    <div className="group relative flex flex-col bg-white rounded-2xl sm:rounded-[2rem] overflow-hidden border border-gray-100 transition-all duration-300 hover:shadow-xl">
      
      {/* Image Section */}
      <Link to={`/product/${product.id}`} className="relative aspect-[3/4] overflow-hidden block">
        <img 
          src={imageUrl} 
          alt={product.name}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
          loading="lazy"
        />
        
        {/* Mobile Quick Add */}
        <div className="absolute bottom-3 right-3 sm:hidden">
          <button 
            onClick={handleQuickAdd}
            className="bg-black text-white w-10 h-10 rounded-full flex items-center justify-center shadow-lg active:bg-orange-600 transition-colors"
          >
            <i className="fa-solid fa-plus"></i>
          </button>
        </div>

        {/* Desktop Quick Add Overlay */}
        <div className="hidden sm:flex absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity items-center justify-center">
          <button 
            onClick={handleQuickAdd}
            className="bg-white text-black px-6 py-3 rounded-full font-bold text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-all transform translate-y-4 group-hover:translate-y-0"
          >
            Quick Add +
          </button>
        </div>
      </Link>

      {/* Content Section */}
      <div className="p-3 sm:p-5 flex flex-col flex-grow">
        <div className="flex justify-between items-start mb-1">
          <Link to={`/product/${product.id}`} className="flex-1">
            <h3 className="text-[11px] sm:text-sm font-bold text-gray-900 uppercase tracking-tight truncate pr-2">
              {product.name}
            </h3>
          </Link>
          <span className="text-[9px] sm:text-[10px] font-black text-orange-600 bg-orange-50 px-2 py-0.5 rounded-md self-start">
            NEW
          </span>
        </div>
        
        <div className="flex items-center justify-between mt-auto">
          <p className="text-sm sm:text-lg font-black text-gray-800">
            ₹{product.price}
          </p>
          <p className="hidden sm:block text-[10px] text-gray-400 font-medium italic">
            {product.category?.name}
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProductCard;