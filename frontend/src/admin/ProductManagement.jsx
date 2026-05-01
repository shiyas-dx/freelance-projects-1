import { useEffect, useState, useRef, useCallback } from "react";
import {
  Plus, Edit2, Trash2, Loader2, Search, X, Check,
  ChevronDown, Package, Tag, Flame, Trophy, Sparkles,
  Snowflake, ToggleLeft, ToggleRight, ImagePlus, Save,
  AlertTriangle, Eye, EyeOff, Filter, ChevronLeft, ChevronRight
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import toast from "react-hot-toast";

const BASE_URL = "http://127.0.0.1:8000";
const PER_PAGE = 12;

const getImg = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

/* ── debounce ───────────────────────────────────────── */
function useDebounce(v, d = 350) {
  const [dv, setDv] = useState(v);
  useEffect(() => { const id = setTimeout(() => setDv(v), d); return () => clearTimeout(id); }, [v, d]);
  return dv;
}

/* ── stock badge ────────────────────────────────────── */
function StockBadge({ stock }) {
  if (stock <= 0)  return <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-50 text-red-600 border border-red-100">Out of Stock</span>;
  if (stock <= 5)  return <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-red-50 text-red-500 border border-red-100">Low · {stock}</span>;
  if (stock <= 15) return <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-amber-50 text-amber-600 border border-amber-100">Mid · {stock}</span>;
  return <span className="px-2.5 py-1 rounded-full text-[9px] font-black uppercase bg-green-50 text-green-600 border border-green-100">In Stock · {stock}</span>;
}

/* ── promo pill config ──────────────────────────────── */
const PROMOS = [
  { field: "is_today_sale",   label: "Sale",     icon: Flame,    color: "text-orange-500", activeBg: "bg-orange-500" },
  { field: "is_best_seller",  label: "Best",     icon: Trophy,   color: "text-amber-500",  activeBg: "bg-amber-500"  },
  { field: "is_new_arrival",  label: "New",      icon: Sparkles, color: "text-blue-500",   activeBg: "bg-blue-500"   },
  { field: "is_white_friday", label: "WF",       icon: Snowflake,color: "text-indigo-500", activeBg: "bg-indigo-500" },
];

/* ── toggle button ──────────────────────────────────── */
function Toggle({ active, onChange, title, icon: Icon, activeClass = "bg-orange-500" }) {
  return (
    <button
      title={title}
      onClick={onChange}
      className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all border
        ${active ? `${activeClass} border-transparent text-white` : "bg-gray-50 border-gray-100 text-gray-300 hover:text-gray-500"}`}
    >
      <Icon size={13} />
    </button>
  );
}

/* ── confirm dialog ─────────────────────────────────── */
function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50" onClick={onCancel} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-black text-gray-900 text-lg uppercase tracking-tight">{title}</p>
                <p className="text-gray-400 font-bold text-sm mt-1">{message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition">
                Delete
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ── product form modal ─────────────────────────────── */
function ProductModal({ open, onClose, onSave, categories, editProduct }) {
  const isEdit = !!editProduct;
  const fileRef = useRef();
  const [preview, setPreview] = useState(null);
  const [saving, setSaving] = useState(false);

  // Gallery state
  const [existingImages, setExistingImages] = useState([]); // Images already on server
  const [newGalleryFiles, setNewGalleryFiles] = useState([]); // New files to upload
  const [newGalleryPreviews, setNewGalleryPreviews] = useState([]);

  const [form, setForm] = useState({
    name: "", description: "", price: "", stock: "",
    category_id: "", is_active: true,
    is_today_sale: false, is_best_seller: false,
    is_new_arrival: false, is_white_friday: false,
  });

  useEffect(() => {
    if (editProduct) {
      setForm({
        name:            editProduct.name           || "",
        description:     editProduct.description    || "",
        price:           editProduct.price          || "",
        stock:           editProduct.stock          || "",
        category_id:     editProduct.category?.id   || editProduct.category_id || "",
        is_active:       editProduct.is_active      ?? true,
        is_today_sale:   editProduct.is_today_sale  || false,
        is_best_seller:  editProduct.is_best_seller || false,
        is_new_arrival:  editProduct.is_new_arrival || false,
        is_white_friday: editProduct.is_white_friday|| false,
      });
      setPreview(null);
      setExistingImages(editProduct.images || []);
      setNewGalleryFiles([]);
      setNewGalleryPreviews([]);
    } else {
      setForm({ name: "", description: "", price: "", stock: "", category_id: "",
        is_active: true, is_today_sale: false, is_best_seller: false,
        is_new_arrival: false, is_white_friday: false });
      setPreview(null);
      setExistingImages([]);
      setNewGalleryFiles([]);
      setNewGalleryPreviews([]);
    }
  }, [editProduct, open]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

const handleSubmit = async (e) => {
  e.preventDefault();
  setSaving(true);

  const formData = new FormData();

  formData.append('name', form.name || "");
  formData.append('category_id', form.category_id || "");
  formData.append('price', form.price || 0);
  formData.append('stock', form.stock || 0);
  formData.append('description', form.description || "");

  formData.append('is_active', String(form.is_active));
  formData.append('is_today_sale', String(form.is_today_sale));
  formData.append('is_best_seller', String(form.is_best_seller));
  formData.append('is_new_arrival', String(form.is_new_arrival));
  formData.append('is_white_friday', String(form.is_white_friday));

  if (fileRef.current?.files[0]) {
    formData.append('image', fileRef.current.files[0]);
  }
  if (newGalleryFiles && newGalleryFiles.length > 0) {
    newGalleryFiles.forEach((file) => {
      formData.append('uploaded_images', file);
    });
  }

  try {
    const config = {
      headers: { 'Content-Type': 'multipart/form-data' }
    };

    if (isEdit) {
      await API.patch(`admin-products/${editProduct.id}/`, formData, config);
    } else {
      await API.post('admin-products/', formData, config);
    }

    toast.success(isEdit ? "Product Updated!" : "Product Created!");
    onClose();
    if (typeof fetchProducts === 'function') fetchProducts(); 
    
  } catch (error) {
    console.error("Payload Error:", error.response?.data);
    const serverMsg = error.response?.data?.uploaded_images?.[0] || "Error saving product";
    toast.error(serverMsg);
  } finally {
    setSaving(false);
  }
};

  const inputCls = "w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold outline-none transition-all placeholder-gray-300";

const handleDeleteExistingImage = async (imageId) => {
  if (!window.confirm("Are you sure you want to remove this image?")) return;

  try {
    await API.delete(`product-images/${imageId}/`); 
    
    setExistingImages(prev => prev.filter(img => img.id !== imageId));
    toast.success("Image deleted");
  } catch (error) {
    console.error("Delete error:", error.response);
    toast.error("Could not delete image");
  }
};

  const removeNewSelection = (index) => {
    setNewGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    setNewGalleryFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    setNewGalleryFiles(prev => [...prev, ...files]);
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setNewGalleryPreviews(prev => [...prev, ...newPreviews]);
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 1. Backdrop: Now handles the centering via Flexbox */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            {/* 2. Modal Container: Removed translation logic to prevent cutoff */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()} // Prevents closing when clicking form
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* 3. Sticky Header */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-white z-20">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    {isEdit ? "Edit Product" : "New Product"}
                  </p>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter text-gray-900 leading-tight">
                    {isEdit ? editProduct.name : "Add to Inventory"}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 transition text-gray-500"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 4. Scrollable Form Area */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-7 space-y-6">
                  {/* Image upload - Main Image (unchanged) */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                      Product Image
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="relative aspect-video rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-orange-400 transition cursor-pointer group flex items-center justify-center"
                    >
                      {preview || (isEdit && getImg(editProduct?.image)) ? (
                        <img
                          src={preview || getImg(editProduct?.image)}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="flex flex-col items-center gap-2 text-gray-300">
                          <ImagePlus size={32} />
                          <p className="text-[10px] font-black uppercase tracking-widest">
                            Click to upload
                          </p>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                        <div className="bg-white rounded-full p-2">
                          <ImagePlus size={18} />
                        </div>
                      </div>
                    </div>
                    <input
                      type="file"
                      ref={fileRef}
                      hidden
                      accept="image/*"
                      onChange={(e) =>
                        e.target.files[0] &&
                        setPreview(URL.createObjectURL(e.target.files[0]))
                      }
                    />
                  </div>

                  {/* Gallery Images (New Section) - Showing both existing and new */}
                  <div className="mt-6">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                      Gallery Slider Images (Multiple)
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {/* 1. Render Existing Images (From Server) */}
                      {existingImages.map((img) => (
                        <div key={img.id} className="relative aspect-square rounded-xl overflow-hidden border border-gray-100">
                          <img src={img.image} className="w-full h-full object-cover opacity-70" alt="Gallery" />
                          <button 
                            type="button"
                            onClick={() => handleDeleteExistingImage(img.id)}
                            className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1"
                          >
                            <Trash2 size={10} />
                          </button>
                        </div>
                      ))}

                      {/* 2. Render New Previews (Selected but not uploaded) */}
                      {newGalleryPreviews.map((url, index) => (
                        <div key={`new-${index}`} className="relative aspect-square rounded-xl overflow-hidden border border-orange-200">
                          <img src={url} className="w-full h-full object-cover" alt="New gallery" />
                          <button 
                            type="button"
                            onClick={() => removeNewSelection(index)}
                            className="absolute top-1 right-1 bg-red-600 text-white rounded-full p-1"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))}

                      {/* 3. Add Button */}
                      <label className="aspect-square rounded-xl border-2 border-dashed border-gray-200 flex flex-col items-center justify-center cursor-pointer hover:border-orange-500 transition">
                        <Plus size={20} className="text-gray-300" />
                        <span className="text-[8px] font-black uppercase text-gray-400">Add</span>
                        <input
                          type="file"
                          multiple
                          hidden
                          onChange={handleFileSelect}
                        />
                      </label>
                    </div>
                  </div>

                  {/* Name + Category */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Product Name <span className="text-red-400">*</span>
                      </label>
                      <input
                        className={inputCls}
                        placeholder="e.g. Slim Fit Chinos"
                        value={form.name}
                        onChange={(e) => set("name", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Category <span className="text-red-400">*</span>
                      </label>
                      <select
                        className={inputCls}
                        value={form.category_id}
                        onChange={(e) => set("category_id", e.target.value)}
                        required
                      >
                        <option value="">Select category…</option>
                        {categories.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Price + Stock */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Price (QAR) <span className="text-red-400">*</span>
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={form.price}
                        onChange={(e) => set("price", e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Stock Qty <span className="text-red-400">*</span>
                      </label>
                      <input
                        className={inputCls}
                        type="number"
                        min="0"
                        placeholder="0"
                        value={form.stock}
                        onChange={(e) => set("stock", e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                      Description
                    </label>
                    <textarea
                      className={inputCls}
                      rows={3}
                      placeholder="Product description…"
                      value={form.description}
                      onChange={(e) => set("description", e.target.value)}
                    />
                  </div>

                  {/* Toggles */}
                  <div className="bg-gray-50 rounded-2xl p-5 space-y-4">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                      Visibility & Promotions
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      <label className="flex items-center gap-2.5 cursor-pointer group">
                        <button
                          type="button"
                          onClick={() => set("is_active", !form.is_active)}
                          className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0
                            ${form.is_active ? "bg-black" : "bg-gray-200"}`}
                        >
                          <span
                            className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                            ${form.is_active ? "translate-x-5" : "translate-x-1"}`}
                          />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                          Active
                        </span>
                      </label>

                      {PROMOS.map(({ field, label, icon: Icon, activeBg }) => (
                        <label
                          key={field}
                          className="flex items-center gap-2.5 cursor-pointer"
                        >
                          <button
                            type="button"
                            onClick={() => set(field, !form[field])}
                            className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0
                              ${form[field] ? activeBg : "bg-gray-200"}`}
                          >
                            <span
                              className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform
                              ${form[field] ? "translate-x-5" : "translate-x-1"}`}
                            />
                          </button>
                          <Icon
                            size={13}
                            className={form[field] ? "text-gray-700" : "text-gray-400"}
                          />
                          <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">
                            {label}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Footer Buttons: Sticky for easy access */}
                  <div className="flex gap-3 pt-2 sticky bottom-0 bg-white pb-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-4 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 transition flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      {saving ? "Saving…" : isEdit ? "Save Changes" : "Create Product"}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ══ MAIN ════════════════════════════════════════════════ */
export default function ProductManagement() {
  const [products,    setProducts]    = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);
  const [total,       setTotal]       = useState(0);
  const [page,        setPage]        = useState(1);

  // filters
  const [search,      setSearch]      = useState("");
  const [selectedCat, setSelectedCat] = useState("");
  const [promoFilter, setPromoFilter] = useState("");
  const [activeFilter,setActiveFilter]= useState("");

  // modal / confirm
  const [modalOpen,   setModalOpen]   = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [deleteId,    setDeleteId]    = useState(null);

  const debouncedSearch = useDebounce(search, 350);

  /* ── fetch ── */
  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search",    debouncedSearch);
      if (selectedCat)     params.set("category",  selectedCat);
      if (promoFilter)     params.set("promo",      promoFilter);
      if (activeFilter)    params.set("is_active",  activeFilter);
      params.set("page",     page);
      params.set("page_size", PER_PAGE);
      const res = await API.get(`admin-products/?${params}`);
      // Support both paginated { count, results } and plain array
      if (Array.isArray(res.data)) {
        setProducts(res.data); setTotal(res.data.length);
      } else {
        setProducts(res.data.results || []); setTotal(res.data.count || 0);
      }
    } catch { toast.error("Failed to fetch products"); }
    finally  { setLoading(false); }
  }, [debouncedSearch, selectedCat, promoFilter, activeFilter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  useEffect(() => {
    API.get("categories/").then((r) => setCategories(r.data)).catch(() => {});
  }, []);

  /* reset page on filter change */
  useEffect(() => { setPage(1); }, [debouncedSearch, selectedCat, promoFilter, activeFilter]);

  /* ── quick toggle ── */
const toggleField = async (id, fieldName, currentValue) => {
  try {
    // FIX: Change 'admin/products' to 'admin-products' 
    // to match your working detail/update endpoint
    await API.patch(`admin-products/${id}/`, {
      [fieldName]: !currentValue
    });
    
    // Refresh the list locally to show the change
    fetchProducts();
    toast.success("Status updated");
  } catch (error) {
    console.error("Toggle error:", error);
    toast.error("Failed to update status");
  }
};

  /* ── delete ── */
  const handleDelete = async () => {
    try {
      await API.delete(`admin/products/${deleteId}/`);
      setProducts((prev) => prev.filter((p) => p.id !== deleteId));
      setTotal((t) => t - 1);
      toast.success("Product deleted");
    } catch { toast.error("Delete failed"); }
    finally { setDeleteId(null); }
  };

  /* ── save from modal ── */
  const handleSave = (saved, isEdit) => {
    if (isEdit) {
      setProducts((prev) => prev.map((p) => p.id === saved.id ? saved : p));
    } else {
      setProducts((prev) => [saved, ...prev]);
      setTotal((t) => t + 1);
    }
  };

  const totalPages = Math.ceil(total / PER_PAGE);
  const activeFiltersCount = [selectedCat, promoFilter, activeFilter].filter(Boolean).length;

  return (
    <div className="space-y-6">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            Inventory<span className="text-orange-600">.</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
            {total} product{total !== 1 ? "s" : ""} total
          </p>
        </div>
        <button
          onClick={() => { setEditProduct(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-black text-white px-6 py-3.5 rounded-2xl hover:bg-orange-600 transition shadow-lg text-[10px] font-black uppercase tracking-widest"
        >
          <Plus size={16} /> New Product
        </button>
      </div>

      {/* ── FILTER BAR ── */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative sm:col-span-2 lg:col-span-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search products…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-9 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={13} />
            </button>
          )}
        </div>

        {/* Category */}
        <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition">
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>

        {/* Promo filter */}
        <select value={promoFilter} onChange={(e) => setPromoFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition">
          <option value="">All Promos</option>
          <option value="is_today_sale">Today's Sale</option>
          <option value="is_best_seller">Best Seller</option>
          <option value="is_new_arrival">New Arrival</option>
          <option value="is_white_friday">White Friday</option>
        </select>

        {/* Active filter */}
        <select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none focus:border-orange-400 focus:bg-white transition">
          <option value="">All Status</option>
          <option value="true">Active Only</option>
          <option value="false">Inactive Only</option>
        </select>
      </div>

      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Filters:</span>
          {selectedCat && (
            <button onClick={() => setSelectedCat("")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black text-white text-[10px] font-black uppercase tracking-widest">
              {categories.find((c) => String(c.id) === String(selectedCat))?.name} <X size={10} />
            </button>
          )}
          {promoFilter && (
            <button onClick={() => setPromoFilter("")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-500 text-white text-[10px] font-black uppercase tracking-widest">
              {promoFilter.replace("is_", "").replace("_", " ")} <X size={10} />
            </button>
          )}
          {activeFilter && (
            <button onClick={() => setActiveFilter("")}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-700 text-white text-[10px] font-black uppercase tracking-widest">
              {activeFilter === "true" ? "Active" : "Inactive"} <X size={10} />
            </button>
          )}
          <button onClick={() => { setSelectedCat(""); setPromoFilter(""); setActiveFilter(""); }}
            className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-red-500 transition">
            Clear all
          </button>
        </div>
      )}

      {/* ── PRODUCT TABLE ── */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {/* Loading overlay */}
        {loading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 size={32} className="text-gray-200 animate-spin" />
          </div>
        )}

        {/* Empty state */}
        {!loading && products.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center px-6">
            <div className="w-16 h-16 rounded-full bg-gray-50 border border-gray-100 flex items-center justify-center">
              <Package size={28} className="text-gray-200" />
            </div>
            <div>
              <p className="font-black text-gray-700 uppercase tracking-tight">No products found</p>
              <p className="text-gray-400 font-bold text-sm mt-1">Try adjusting your filters or add a new product.</p>
            </div>
            <button onClick={() => { setEditProduct(null); setModalOpen(true); }}
              className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition">
              <Plus size={13} /> Add Product
            </button>
          </div>
        )}

        {!loading && products.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead>
                <tr className="border-b border-gray-50 bg-gray-50/80">
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Product</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Category</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Price</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Stock</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Active</th>
                  <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-center">Promos</th>
                  <th className="px-5 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <AnimatePresence mode="popLayout">
                  {products.map((p, i) => (
                    <motion.tr
                      key={p.id}
                      layout
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: i * 0.03 }}
                      className="group hover:bg-gray-50/60 transition-colors"
                    >
                      {/* Product */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-11 h-11 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0 border border-gray-100">
                            {getImg(p.image)
                              ? <img src={getImg(p.image)} alt={p.name} className="w-full h-full object-cover" />
                              : <Package size={18} className="text-gray-300 m-auto mt-2.5" />}
                          </div>
                          <div className="min-w-0">
                            <p className="font-black text-gray-900 text-sm truncate max-w-[160px] group-hover:text-orange-600 transition-colors">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-gray-400 font-bold mt-0.5">ID #{p.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-4">
                        <span className="px-3 py-1.5 rounded-xl bg-gray-100 text-[10px] font-black uppercase tracking-wider text-gray-600 capitalize">
                          {p.category?.name || "—"}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-black text-gray-900 text-sm"><span class="font-semibold text-gray-700">QAR</span>{p.price}</p>
                          <p className="text-[10px] text-gray-300 line-through font-bold"><span class="font-semibold text-gray-700">QAR</span>{(p.price * 1.2).toFixed(0)}</p>
                        </div>
                      </td>

                      {/* Stock */}
                      <td className="px-4 py-4">
                        <StockBadge stock={p.stock} />
                      </td>

                      {/* Active toggle */}
                      <td className="px-4 py-4 text-center">
                        <button
                          onClick={() => toggleField(p.id, "is_active", p.is_active)}
                          title={p.is_active ? "Click to deactivate" : "Click to activate"}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-widest transition-all
                            ${p.is_active
                              ? "bg-green-50 border-green-200 text-green-700 hover:bg-red-50 hover:border-red-200 hover:text-red-600"
                              : "bg-gray-50 border-gray-200 text-gray-400 hover:bg-green-50 hover:border-green-200 hover:text-green-600"}`}
                        >
                          {p.is_active ? <Eye size={11} /> : <EyeOff size={11} />}
                          {p.is_active ? "Live" : "Hidden"}
                        </button>
                      </td>

                      {/* Promo toggles */}
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {PROMOS.map(({ field, label, icon: Icon, activeBg }) => (
                            <Toggle
                              key={field}
                              active={p[field]}
                              onChange={() => toggleField(p.id, field, p[field])}
                              title={label}
                              icon={Icon}
                              activeClass={activeBg}
                            />
                          ))}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="px-5 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => { setEditProduct(p); setModalOpen(true); }}
                            className="p-2.5 rounded-xl border border-gray-100 hover:bg-black hover:text-white hover:border-black transition-all text-gray-500"
                            title="Edit"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteId(p.id)}
                            className="p-2.5 rounded-xl border border-gray-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-gray-500"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination footer */}
        {!loading && totalPages > 1 && (
          <div className="flex items-center justify-between px-5 py-4 border-t border-gray-50">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
              Page {page} of {totalPages} · {total} products
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronLeft size={14} />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                const p = totalPages <= 5 ? i + 1 : page <= 3 ? i + 1 : page >= totalPages - 2 ? totalPages - 4 + i : page - 2 + i;
                return (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-9 h-9 rounded-xl text-[11px] font-black transition-all
                      ${p === page ? "bg-black text-white border-black" : "border border-gray-200 text-gray-600 hover:bg-black hover:text-white hover:border-black"}`}>
                    {p}
                  </button>
                );
              })}
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="w-9 h-9 rounded-xl border border-gray-200 flex items-center justify-center hover:bg-black hover:text-white hover:border-black disabled:opacity-30 disabled:cursor-not-allowed transition-all"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── MODALS ── */}
      <ProductModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditProduct(null); }}
        onSave={handleSave}
        categories={categories}
        editProduct={editProduct}
      />
      <ConfirmDialog
        open={!!deleteId}
        title="Delete Product"
        message="This action is permanent and cannot be undone."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
