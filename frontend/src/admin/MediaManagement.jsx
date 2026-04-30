import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ImagePlus, Save, Loader2, X, Check, Layers,
  LayoutTemplate, Tag, RefreshCcw, Eye, EyeOff,
  GripVertical, Plus, Trash2, AlertTriangle, Edit2,
  ArrowUp, ArrowDown
} from "lucide-react";
import API from "../services/api";
import toast from "react-hot-toast";

const BASE_URL = "http://127.0.0.1:8000";
const getImg = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

/* ── confirm dialog ─────────────────────────────────── */
function ConfirmDialog({ open, onConfirm, onCancel, message }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50" onClick={onCancel} />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm"
          >
            <div className="flex items-start gap-4 mb-5">
              <div className="w-11 h-11 rounded-2xl bg-red-50 flex items-center justify-center flex-shrink-0">
                <AlertTriangle size={20} className="text-red-500" />
              </div>
              <div>
                <p className="font-black text-gray-900 uppercase tracking-tight text-base">Are you sure?</p>
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

/* ── image upload zone ──────────────────────────────── */
function ImageZone({ currentImage, preview, onFileChange, aspect = "16/9", label = "Click or drag to upload" }) {
  const fileRef = useRef();
  const [dragging, setDragging] = useState(false);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type.startsWith("image/")) onFileChange(file);
  };

  const displayImg = preview || getImg(currentImage);

  return (
    <div
      onClick={() => fileRef.current?.click()}
      onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      className={`relative overflow-hidden rounded-2xl border-2 border-dashed cursor-pointer transition-all group
        ${dragging ? "border-orange-400 bg-orange-50/50" : displayImg ? "border-gray-200 bg-gray-50" : "border-gray-200 hover:border-orange-400 bg-gray-50 hover:bg-orange-50/30"}`}
      style={{ aspectRatio: aspect }}
    >
      {displayImg ? (
        <>
          <img src={displayImg} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
            <div className="flex items-center gap-2 bg-white/90 rounded-full px-4 py-2 text-[10px] font-black uppercase tracking-widest text-gray-800">
              <ImagePlus size={13} /> Replace Image
            </div>
          </div>
          {preview && (
            <div className="absolute top-2 right-2 bg-orange-500 text-white text-[9px] font-black uppercase px-2.5 py-1 rounded-full">
              New
            </div>
          )}
        </>
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-gray-300">
          <ImagePlus size={28} className={dragging ? "text-orange-400" : ""} />
          <p className="text-[10px] font-black uppercase tracking-widest">{label}</p>
        </div>
      )}
      <input ref={fileRef} type="file" hidden accept="image/*"
        onChange={(e) => e.target.files[0] && onFileChange(e.target.files[0])} />
    </div>
  );
}

/* ── SLIDE CARD ─────────────────────────────────────── */
function SlideCard({ slide, index, total, onSave, onDelete, onMoveUp, onMoveDown }) {
  const [preview,  setPreview]  = useState(null);
  const [file,     setFile]     = useState(null);
  const [form,     setForm]     = useState({ title: slide.title || "", subtitle: slide.subtitle || "", link_url: slide.link_url || "/shop", is_active: slide.is_active ?? true });
  const [saving,   setSaving]   = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const isDirty = !!file ||
    form.title !== slide.title ||
    form.subtitle !== slide.subtitle ||
    form.link_url !== slide.link_url ||
    form.is_active !== slide.is_active;

  const handleSave = async () => {
    setSaving(true);
    const fd = new FormData();
    fd.append("title",     form.title);
    fd.append("subtitle",  form.subtitle);
    fd.append("link_url",  form.link_url);
    fd.append("is_active", form.is_active);
    if (file) fd.append("image", file);
    try {
      const res = await API.patch(`admin/slides/${slide.id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSave(res.data);
      setPreview(null);
      setFile(null);
      toast.success("Slide saved");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div layout
      className={`bg-white border rounded-3xl overflow-hidden transition-all shadow-sm
        ${isDirty ? "border-orange-300 shadow-orange-100" : "border-gray-100"}`}>

      {/* Top row — always visible */}
      <div className="flex items-center gap-4 p-4">
        {/* Image preview (16/9 thumb) */}
        <div className="w-32 flex-shrink-0 rounded-2xl overflow-hidden bg-gray-100 border border-gray-100" style={{ aspectRatio: "16/9" }}>
          {(preview || getImg(slide.image)) ? (
            <img src={preview || getImg(slide.image)} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <LayoutTemplate size={20} className="text-gray-300" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Slide {index + 1}</span>
            <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${form.is_active ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-400"}`}>
              {form.is_active ? "Live" : "Hidden"}
            </span>
            {isDirty && <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-orange-50 text-orange-500">Unsaved</span>}
          </div>
          <p className="font-black text-gray-900 text-base uppercase italic tracking-tighter truncate">{form.title || "Untitled Slide"}</p>
          <p className="text-[11px] text-gray-400 font-bold truncate">{form.subtitle}</p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {/* <button onClick={() => setForm({ ...form, is_active: !form.is_active })}
            title={form.is_active ? "Hide slide" : "Show slide"}
            className={`p-2 rounded-xl transition border ${form.is_active ? "text-green-500 bg-green-50 border-green-100 hover:bg-green-100" : "text-gray-400 bg-gray-50 border-gray-100 hover:bg-gray-100"}`}>
            {form.is_active ? <Eye size={14} /> : <EyeOff size={14} />}
          </button> */}
          <button onClick={() => setExpanded((v) => !v)}
            className="p-2 rounded-xl border border-gray-100 text-gray-500 hover:bg-gray-50 transition">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onMoveUp(index)} disabled={index === 0}
            className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition">
            <ArrowUp size={14} />
          </button>
          <button onClick={() => onMoveDown(index)} disabled={index === total - 1}
            className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:bg-gray-50 disabled:opacity-30 transition">
            <ArrowDown size={14} />
          </button>
          <button onClick={() => setDelConfirm(true)}
            className="p-2 rounded-xl border border-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {/* Expanded edit area */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-5 pt-1 border-t border-gray-50 space-y-5">
              {/* Image upload */}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Banner Image</p>
                <ImageZone
                  currentImage={slide.image}
                  preview={preview}
                  onFileChange={(f) => { setFile(f); setPreview(URL.createObjectURL(f)); }}
                  aspect="16/9"
                  label="Upload banner image (recommended 1920×600)"
                />
              </div>

              {/* Text fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Title</label>
                  <input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. NEW COLLECTION"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold outline-none transition placeholder-gray-300" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Subtitle</label>
                  <input value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
                    placeholder="e.g. Premium Style"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold outline-none transition placeholder-gray-300" />
                </div>
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Button Link URL</label>
                  <input value={form.link_url} onChange={(e) => setForm({ ...form, link_url: e.target.value })}
                    placeholder="/shop"
                    className="w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold outline-none transition placeholder-gray-300" />
                </div>
              </div>

              {/* Save */}
              {isDirty && (
                <button onClick={handleSave} disabled={saving}
                  className="w-full flex items-center justify-center gap-2 bg-black text-white py-3.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition disabled:opacity-50">
                  {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  {saving ? "Saving…" : "Save Slide"}
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ConfirmDialog open={delConfirm} onCancel={() => setDelConfirm(false)}
        onConfirm={() => { setDelConfirm(false); onDelete(slide.id); }}
        message="This slide will be permanently removed from the homepage." />
    </motion.div>
  );
}

/* ── FULL CONTROL CATEGORY CARD (updated with name edit + delete) ────────────── */
function CategoryCard({ cat, onSave, onDelete }) {
  const [preview, setPreview] = useState(null);
  const [file,    setFile]    = useState(null);
  const [name,    setName]    = useState(cat.name);
  const [saving,  setSaving]  = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [delConfirm, setDelConfirm] = useState(false);

  const isDirty = file || name !== cat.name;

  const handleSave = async () => {
    if (!isDirty) return;
    setSaving(true);
    const fd = new FormData();
    fd.append("name", name);
    if (file) fd.append("image", file);
    try {
      const res = await API.patch(`admin/categories/${cat.id}/`, fd, { headers: { "Content-Type": "multipart/form-data" } });
      onSave(res.data);
      setPreview(null);
      setFile(null);
      toast.success(`${name} updated`);
    } catch { toast.error("Update failed"); }
    finally { setSaving(false); }
  };

  return (
    <motion.div
      layout
      className={`bg-white border rounded-3xl overflow-hidden transition-all shadow-sm
        ${isDirty ? "border-orange-300 shadow-orange-100" : "border-gray-100"}`}
    >
      {/* Image zone (4:5 portrait) */}
      <div className="p-4 pb-3">
        <ImageZone
          currentImage={cat.image}
          preview={preview}
          onFileChange={(f) => { setFile(f); setPreview(URL.createObjectURL(f)); }}
          aspect="4/5"
          label="Upload category image"
        />
      </div>

      {/* Info + actions */}
      <div className="px-4 pb-4 space-y-3">
        <div className="flex items-center justify-between">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="flex-1 bg-transparent font-black text-gray-900 text-base uppercase italic tracking-tighter focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="p-2 text-gray-400 hover:text-gray-700 transition"
            >
              <Edit2 size={14} />
            </button>
            <button
              onClick={() => setDelConfirm(true)}
              className="p-2 text-gray-400 hover:text-red-500 transition"
            >
              <Trash2 size={14} />
            </button>
          </div>
        </div>

        {isDirty && (
          <button onClick={handleSave} disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-black text-white py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition disabled:opacity-50">
            {saving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
            {saving ? "Saving…" : "Save Changes"}
          </button>
        )}

        {!isDirty && (
          <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400">
            <Check size={12} className="text-green-400" />
            Up to date
          </div>
        )}
      </div>

      <ConfirmDialog
        open={delConfirm}
        onCancel={() => setDelConfirm(false)}
        onConfirm={() => { setDelConfirm(false); onDelete(cat.id); }}
        message={`Category "${cat.name}" will be permanently deleted.`}
      />
    </motion.div>
  );
}

/* ══ MAIN PAGE ═══════════════════════════════════════════ */
export default function MediaManagement() {
  const [activeTab,   setActiveTab]   = useState("slides");
  const [slides,      setSlides]      = useState([]);
  const [categories,  setCategories]  = useState([]);
  const [loading,     setLoading]     = useState(true);

  /* ── new slide modal state ── */
  const [newSlideOpen, setNewSlideOpen] = useState(false);
  const [newFile,      setNewFile]      = useState(null);
  const [newPreview,   setNewPreview]   = useState(null);
  const [newForm,      setNewForm]      = useState({ title: "", subtitle: "", link_url: "/shop", is_active: true });
  const [creating,     setCreating]     = useState(false);

  /* ── new category modal state (full control) ── */
  const [newCatOpen,     setNewCatOpen]     = useState(false);
  const [newCatName,     setNewCatName]     = useState("");
  const [newCatFile,     setNewCatFile]     = useState(null);
  const [newCatPreview,  setNewCatPreview]  = useState(null);
  const [creatingCat,    setCreatingCat]    = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const [sRes, cRes] = await Promise.all([
          API.get("admin/slides/"),
          API.get("admin/categories/"),
        ]);
        setSlides(sRes.data || []);
        setCategories(cRes.data || []);
      } catch { toast.error("Failed to load media"); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  const handleSlideUpdate = (updated) => setSlides((p) => p.map((s) => s.id === updated.id ? updated : s));
  const handleCatUpdate   = (updated) => setCategories((p) => p.map((c) => c.id === updated.id ? updated : c));

  const handleSlideDelete = async (id) => {
    try {
      await API.delete(`admin/slides/${id}/`);
      setSlides((p) => p.filter((s) => s.id !== id));
      toast.success("Slide deleted");
    } catch { toast.error("Delete failed"); }
  };

  const handleCatDelete = async (id) => {
    try {
      await API.delete(`admin/categories/${id}/`);
      setCategories((p) => p.filter((c) => c.id !== id));
      toast.success("Category deleted");
    } catch { toast.error("Delete failed"); }
  };

  /* reorder helpers */
  const moveSlide = (index, dir) => {
    const next = [...slides];
    const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    next.forEach((s, i) => API.patch(`admin/slides/${s.id}/`, { order: i }).catch(() => {}));
    setSlides(next);
  };

  /* create new slide */
  const handleCreateSlide = async () => {
    if (!newForm.title || !newFile) { toast.error("Title and image are required"); return; }
    setCreating(true);
    const fd = new FormData();
    fd.append("title",     newForm.title);
    fd.append("subtitle",  newForm.subtitle);
    fd.append("link_url",  newForm.link_url);
    fd.append("is_active", newForm.is_active);
    fd.append("order",     slides.length);
    fd.append("image",     newFile);
    try {
      const res = await API.post("admin/slides/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setSlides((p) => [...p, res.data]);
      setNewSlideOpen(false);
      setNewFile(null); setNewPreview(null);
      setNewForm({ title: "", subtitle: "", link_url: "/shop", is_active: true });
      toast.success("Slide created");
    } catch { toast.error("Create failed"); }
    finally { setCreating(false); }
  };

  /* create new category (full control) */
  const handleCreateCategory = async () => {
    if (!newCatName) { toast.error("Category name is required"); return; }
    setCreatingCat(true);
    const fd = new FormData();
    fd.append("name", newCatName);
    if (newCatFile) fd.append("image", newCatFile);
    try {
      const res = await API.post("admin/categories/", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setCategories((p) => [...p, res.data]);
      setNewCatOpen(false);
      setNewCatName("");
      setNewCatFile(null);
      setNewCatPreview(null);
      toast.success("Category created");
    } catch { toast.error("Create failed"); }
    finally { setCreatingCat(false); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <Loader2 size={32} className="text-gray-200 animate-spin" />
    </div>
  );

  const inputCls = "w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold outline-none transition placeholder-gray-300";

  return (
    <div className="space-y-6 max-w-5xl">

      {/* ── HEADER ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black italic uppercase tracking-tighter">
            Media Control<span className="text-orange-600">.</span>
          </h2>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mt-0.5">
            Manage homepage slides &amp; category images
          </p>
        </div>
      </div>

      {/* ── TABS ── */}
      <div className="flex bg-gray-100 p-1.5 rounded-2xl shadow-inner w-fit gap-1">
        {[
          { key: "slides",     label: "Hero Slides",       icon: LayoutTemplate, count: slides.length      },
          { key: "categories", label: "Category Images",   icon: Tag,            count: categories.length  },
        ].map(({ key, label, icon: Icon, count }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all
              ${activeTab === key ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
          >
            <Icon size={14} /> {label}
            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${activeTab === key ? "bg-orange-100 text-orange-600" : "bg-gray-200 text-gray-400"}`}>
              {count}
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">

        {/* ══ SLIDES TAB ══ */}
        {activeTab === "slides" && (
          <motion.div key="slides" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4">

            {/* Add slide button */}
            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {slides.length} slide{slides.length !== 1 ? "s" : ""} · Drag ↑↓ to reorder
              </p>
              <button
                onClick={() => setNewSlideOpen(true)}
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition shadow-sm"
              >
                <Plus size={14} /> Add Slide
              </button>
            </div>

            {/* Slide list */}
            {slides.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-20 flex flex-col items-center gap-4 text-center">
                <LayoutTemplate size={32} className="text-gray-200" />
                <p className="font-black text-gray-400 uppercase tracking-tight">No slides yet</p>
                <button onClick={() => setNewSlideOpen(true)}
                  className="inline-flex items-center gap-2 bg-black text-white px-6 py-3 rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition">
                  <Plus size={13} /> Add First Slide
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence mode="popLayout">
                  {slides.map((slide, i) => (
                    <SlideCard
                      key={slide.id}
                      slide={slide}
                      index={i}
                      total={slides.length}
                      onSave={handleSlideUpdate}
                      onDelete={handleSlideDelete}
                      onMoveUp={() => moveSlide(i, -1)}
                      onMoveDown={() => moveSlide(i, 1)}
                    />
                  ))}
                </AnimatePresence>
              </div>
            )}

            {/* ── NEW SLIDE MODAL ── */}
            <AnimatePresence>
              {newSlideOpen && (
                <>
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setNewSlideOpen(false)} />
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 20 }}
                    className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto"
                  >
                    <div className="sticky top-0 bg-white z-10 flex items-center justify-between px-7 py-5 border-b border-gray-100">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">New Hero Slide</p>
                        <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">Add Slide</h2>
                      </div>
                      <button onClick={() => setNewSlideOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition">
                        <X size={18} />
                      </button>
                    </div>

                    <div className="p-7 space-y-5">
                      <div>
                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Banner Image <span className="text-red-400">*</span></p>
                        <ImageZone
                          currentImage={null}
                          preview={newPreview}
                          onFileChange={(f) => { setNewFile(f); setNewPreview(URL.createObjectURL(f)); }}
                          aspect="16/9"
                          label="Upload banner image"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Title <span className="text-red-400">*</span></label>
                          <input className={inputCls} placeholder="e.g. NEW SEASON" value={newForm.title}
                            onChange={(e) => setNewForm({ ...newForm, title: e.target.value })} />
                        </div>
                        <div>
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Subtitle</label>
                          <input className={inputCls} placeholder="e.g. Premium Style" value={newForm.subtitle}
                            onChange={(e) => setNewForm({ ...newForm, subtitle: e.target.value })} />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1.5 block">Button Link</label>
                          <input className={inputCls} placeholder="/shop" value={newForm.link_url}
                            onChange={(e) => setNewForm({ ...newForm, link_url: e.target.value })} />
                        </div>
                      </div>

                      <label className="flex items-center gap-3 cursor-pointer">
                        <button type="button" onClick={() => setNewForm({ ...newForm, is_active: !newForm.is_active })}
                          className={`w-10 h-6 rounded-full transition-colors relative flex-shrink-0 ${newForm.is_active ? "bg-black" : "bg-gray-200"}`}>
                          <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-transform ${newForm.is_active ? "translate-x-5" : "translate-x-1"}`} />
                        </button>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Active (show on homepage)</span>
                      </label>

                      <div className="flex gap-3 pt-2">
                        <button onClick={() => setNewSlideOpen(false)}
                          className="flex-1 py-4 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition">
                          Cancel
                        </button>
                        <button onClick={handleCreateSlide} disabled={creating || !newFile || !newForm.title}
                          className="flex-1 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-40 transition flex items-center justify-center gap-2">
                          {creating ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                          {creating ? "Creating…" : "Create Slide"}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                </>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {/* ══ CATEGORIES TAB (full control) ══ */}
        {activeTab === "categories" && (
          <motion.div key="cats" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-4">

            <div className="flex items-center justify-between">
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                {categories.length} {categories.length === 1 ? "category" : "categories"}
              </p>
              <button
                onClick={() => setNewCatOpen(true)}
                className="inline-flex items-center gap-2 bg-black text-white px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 transition shadow-sm"
              >
                <Plus size={14} /> New Category
              </button>
            </div>

            {categories.length === 0 ? (
              <div className="bg-white border border-dashed border-gray-200 rounded-3xl py-20 flex flex-col items-center gap-4">
                <Tag size={32} className="text-gray-200" />
                <p className="font-black text-gray-400 uppercase tracking-tight">No categories found</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <AnimatePresence mode="popLayout">
                  {categories.map((cat, i) => (
                    <motion.div key={cat.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                      <CategoryCard cat={cat} onSave={handleCatUpdate} onDelete={handleCatDelete} />
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── NEW CATEGORY MODAL (full control) ── */}
      <AnimatePresence>
        {newCatOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50" onClick={() => setNewCatOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-3xl shadow-2xl w-full max-w-md p-7"
            >
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">New Category</p>
                  <h2 className="text-xl font-black uppercase italic tracking-tighter text-gray-900">Add Category</h2>
                </div>
                <button onClick={() => setNewCatOpen(false)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition">
                  <X size={18} />
                </button>
              </div>

              <input
                value={newCatName}
                onChange={(e) => setNewCatName(e.target.value)}
                placeholder="Category name (e.g. Sneakers)"
                className={inputCls}
              />

              <div className="mt-6">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">Category Image</p>
                <ImageZone
                  currentImage={null}
                  preview={newCatPreview}
                  onFileChange={(f) => { setNewCatFile(f); setNewCatPreview(URL.createObjectURL(f)); }}
                  aspect="4/5"
                  label="Upload category image"
                />
              </div>

              <div className="flex gap-3 mt-8">
                <button onClick={() => setNewCatOpen(false)}
                  className="flex-1 py-4 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition">
                  Cancel
                </button>
                <button onClick={handleCreateCategory} disabled={creatingCat || !newCatName}
                  className="flex-1 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-40 transition flex items-center justify-center gap-2">
                  {creatingCat ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                  {creatingCat ? "Creating…" : "Create Category"}
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}