import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import ProductCard from "../components/ProductCard";

function ShopPage() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const location = useLocation();
  const navigate = useNavigate();

  // Helper to get/set URL params easily
  const queryParams = new URLSearchParams(location.search);
  const currentCategory = queryParams.get("category");
  const currentSort = queryParams.get("sort") || "";

  useEffect(() => {
    const fetchFilteredProducts = async () => {
      setLoading(true);
      try {
        // This hits your Django View with ?category=X&sort=Y&search=Z
        const res = await API.get(`products/${location.search}`);
        setProducts(res.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchFilteredProducts();
  }, [location.search]);

  const handleSortChange = (sortValue) => {
    queryParams.set("sort", sortValue);
    navigate(`/shop?${queryParams.toString()}`);
  };

  return (
    <div className="min-h-screen bg-white pt-24 pb-20">
      <div className="max-w-7xl mx-auto px-6">
        
        {/* Header & Internal Filters */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-5xl font-black uppercase italic">The Collection</h1>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-widest mt-2">
              {products.length} Products Found
            </p>
          </div>

          <div className="flex gap-4">
            <select 
              value={currentSort}
              onChange={(e) => handleSortChange(e.target.value)}
              className="px-6 py-3 border-2 border-black rounded-full font-black uppercase text-[10px] outline-none"
            >
              <option value="">Newest First</option>
              <option value="low">Price: Low to High</option>
              <option value="high">Price: High to Low</option>
            </select>
            
            {location.search && (
              <button 
                onClick={() => navigate('/shop')}
                className="px-6 py-3 bg-gray-100 rounded-full font-black uppercase text-[10px]"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} className="aspect-[4/5] bg-gray-50 rounded-[2rem] animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-y-16">
            {products.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}

        {!loading && products.length === 0 && (
          <div className="text-center py-40">
            <h3 className="text-2xl font-black uppercase text-gray-200">No products matching those filters</h3>
          </div>
        )}
      </div>
    </div>
  );
}

export default ShopPage;