import { useState, useEffect, useCallback } from "react";
import {
  Search, X, Loader2, ChevronLeft, ChevronRight,
  Truck, CheckCircle, XCircle, Clock, RefreshCw,
  Package, AlertTriangle, RotateCcw, Trash2,
  ShoppingBag, Calendar, User, MapPin, History,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import API from "../services/api";
import toast from "react-hot-toast";

const PER_PAGE = 10;

const STATUS = {
  Pending:   { dot: "bg-amber-400",   pill: "bg-amber-50 border-amber-200 text-amber-700",    icon: Clock        },
  Shipped:   { dot: "bg-sky-400",     pill: "bg-sky-50 border-sky-200 text-sky-700",           icon: Truck        },
  Delivered: { dot: "bg-emerald-400", pill: "bg-emerald-50 border-emerald-200 text-emerald-700", icon: CheckCircle },
  Cancelled: { dot: "bg-rose-400",     pill: "bg-rose-50 border-rose-200 text-rose-700",       icon: XCircle      },
};

const fmt = (iso) =>
  iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

function useDebounce(v, d = 400) {
  const [dv, setDv] = useState(v);
  useEffect(() => {
    const id = setTimeout(() => setDv(v), d);
    return () => clearTimeout(id);
  }, [v, d]);
  return dv;
}

/* ══ ConfirmDialog ══ */
function ConfirmDialog({ open, title, message, confirmLabel = "Confirm", danger = false, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[80]"
            onClick={onCancel}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 10 }}
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[90] bg-white rounded-3xl shadow-2xl p-7 w-full max-w-sm"
          >
            <div className="flex items-start gap-4 mb-6">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 ${danger ? "bg-rose-50" : "bg-emerald-50"}`}>
                <AlertTriangle size={20} className={danger ? "text-rose-500" : "text-emerald-500"} />
              </div>
              <div>
                <p className="font-black text-gray-900 text-base uppercase tracking-tight">{title}</p>
                <p className="text-gray-400 font-bold text-sm mt-1 leading-relaxed">{message}</p>
              </div>
            </div>
            <div className="flex gap-3">
              <button onClick={onCancel} className="flex-1 py-3 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition">
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className={`flex-1 py-3 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest transition
                  ${danger ? "bg-rose-600 hover:bg-rose-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
              >
                {confirmLabel}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ══ StatusBadge ══ */
function StatusBadge({ status }) {
  const cfg = STATUS[status] || STATUS.Cancelled;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-black uppercase tracking-widest ${cfg.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${cfg.dot}`} />
      {status}
    </span>
  );
}

/* ══ HistoryDrawer ══ */
function HistoryDrawer({ order, onClose }) {
  const [local, setLocal] = useState(order);
  const [fetching, setFetching] = useState(false);

  useEffect(() => {
    if (!order) { setLocal(null); return; }
    setLocal(order);
    setFetching(true);
    API.get(`admin/orders/${order.id}/`)
      .then((res) => setLocal(res.data))
      .catch(() => toast.error("Error loading details"))
      .finally(() => setFetching(false));
  }, [order?.id]);

  return (
    <AnimatePresence>
      {local && (
        <>
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[40]"
            onClick={onClose}
          />
          <motion.div
            initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 300 }}
            className="fixed right-0 top-0 h-full w-full max-w-[420px] bg-white z-[50] shadow-2xl flex flex-col"
          >
            <div className="p-6 border-b bg-gray-50 border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Archived Order</p>
                    {fetching && <Loader2 size={11} className="animate-spin text-gray-400" />}
                  </div>
                  <h2 className="text-3xl font-black text-gray-900 tracking-tight leading-none">#{local.id}</h2>
                  <p className="text-sm text-gray-500 mt-1">Originally Placed {fmt(local.created_at)}</p>
                </div>
                <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-black/10 transition-colors text-gray-500">
                  <X size={18} />
                </button>
              </div>
              <StatusBadge status={local.status} />
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              <section>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                  <User size={10} /> Customer
                </p>
                <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-2xl">
                  <div className="w-10 h-10 rounded-2xl bg-gray-200 flex items-center justify-center text-gray-600 font-black text-sm flex-shrink-0">
                    {local.name?.charAt(0)?.toUpperCase()}
                  </div>
                  <div>
                    <p className="font-black text-sm text-gray-900">{local.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold mt-0.5">
                      {local.user ? `@${local.user.username}` : "Guest checkout"}
                    </p>
                  </div>
                </div>
              </section>

              <section>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                  <MapPin size={10} /> Shipping Destination
                </p>
                <div className="p-4 bg-gray-50 rounded-2xl">
                  <p className="font-black text-sm text-gray-900">{local.city}</p>
                  <p className="text-sm text-gray-500 mt-0.5">{local.address}</p>
                </div>
              </section>

              <section>
                <p className="text-[9px] font-black uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-1.5">
                  <Package size={10} /> Order Summary · {local.items?.length || 0} Items
                </p>
                <div className="space-y-2">
                  {(local.items || []).map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-3.5 bg-gray-50 rounded-2xl">
                      <div className="w-9 h-9 bg-gray-200 rounded-xl overflow-hidden flex-shrink-0">
                        {item.product_image ? (
                          <img src={item.product_image} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center"><ShoppingBag size={14} className="text-gray-400" /></div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-800 truncate">{item.product_name}</p>
                        <p className="text-[10px] text-gray-400 font-bold mt-0.5">Qty · {item.quantity}</p>
                      </div>
                      <p className="text-[11px] font-black text-gray-900 flex-shrink-0">
                        QAR {(parseFloat(item.price_at_purchase) * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            </div>

            <div className="p-6 border-t border-gray-100 flex-shrink-0">
              <div className="flex justify-between items-center">
                <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">Grand Total</p>
                <p className="text-2xl font-black text-gray-900 tracking-tight">QAR {local.total_price}</p>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

/* ══ OrderHistory Component ══ */
export default function OrderHistory() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sortBy, setSortBy] = useState("-created_at");
  const [confirmDialog, setConfirmDialog] = useState(null);

  const debouncedSearch = useDebounce(search);
  
  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get(`admin/orders/`, {
        params: {
          is_deleted: "true", 
          search: debouncedSearch,
          status: statusFilter,
          ordering: sortBy,
          page: page,
          page_size: PER_PAGE,
        }
      });
      // FIX: Your Network tab shows the data inside res.data, 
      // but if you have pagination on, it is res.data.results
      const data = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setOrders(data);
      setTotal(res.data.count || data.length || 0);
    } catch (err) {
      toast.error("Could not load history");
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, statusFilter, sortBy, page]);

  // TRIGGER FETCH ON MOUNT AND FILTER CHANGE
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleBulkAction = async (action, ids) => {
    setActionLoading(true);
    try {
      await API.post(`admin/orders/bulk-action/`, { ids, action });
      const successMsg = action === 'restore' 
        ? "Orders restored to active list" 
        : "Orders permanently removed";
      toast.success(successMsg);
      fetchOrders();
      setSelectedIds([]);
    } catch (err) {
      toast.error(err.response?.data?.error || "Action failed");
    } finally {
      setActionLoading(false);
      setConfirmDialog(null);
    }
  };

  const executeConfirm = () => {
    if (!confirmDialog) return;
    handleBulkAction(confirmDialog.type, confirmDialog.ids);
  };

  const allSelected = orders.length > 0 && selectedIds.length === orders.length;
  const totalPages = Math.ceil(total / PER_PAGE);

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-2xl bg-gray-100 flex items-center justify-center">
              <History size={16} className="text-gray-500" />
            </div>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">
              Archive History<span className="text-rose-500">.</span>
            </h2>
          </div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">
            {total} archived records · Manage deleted orders
          </p>
        </div>
        <button onClick={fetchOrders} className="inline-flex items-center gap-2 bg-black text-white px-5 py-3 rounded-2xl hover:bg-gray-800 transition text-[10px] font-black uppercase tracking-widest">
          <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Sync History
        </button>
      </div>

      {/* SEARCH/FILTER BAR */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-sm p-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search ID or Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-2xl text-[11px] font-bold outline-none focus:border-rose-300 transition"
          />
        </div>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none cursor-pointer">
          <option value="">Filter by Status</option>
          {Object.keys(STATUS).map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-gray-50 border border-gray-100 px-4 py-3 rounded-2xl text-[11px] font-bold outline-none cursor-pointer">
          <option value="-created_at">Date: Newest</option>
          <option value="created_at">Date: Oldest</option>
          <option value="-total_price">Value: High to Low</option>
        </select>
      </div>

      {/* BULK ACTIONS */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }} className="bg-gray-900 p-3 rounded-2xl flex items-center gap-3">
            <span className="text-[10px] font-black text-gray-400 ml-2 uppercase">{selectedIds.length} Selected</span>
            <div className="flex gap-2 ml-auto">
              <button onClick={() => setConfirmDialog({ type: 'restore', ids: selectedIds })} className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-emerald-500/20 transition">
                <RotateCcw size={12} /> Restore
              </button>
              <button onClick={() => setConfirmDialog({ type: 'purge', ids: selectedIds })} className="bg-rose-500/10 text-rose-400 px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-500/20 transition">
                <Trash2 size={12} /> Purge
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLE */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50/80 border-b border-gray-50">
              <tr>
                <th className="p-5 w-10">
                  <input type="checkbox" checked={allSelected} onChange={(e) => setSelectedIds(e.target.checked ? orders.map(o => o.id) : [])} className="accent-black" />
                </th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Order Ref</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Customer</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Amount</th>
                <th className="px-4 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td colSpan={6} className="p-8 bg-gray-50/30"></td>
                  </tr>
                ))
              ) : orders.map((o) => (
                <tr key={o.id} className={`hover:bg-gray-50/50 transition-colors cursor-pointer ${selectedIds.includes(o.id) ? 'bg-rose-50/30' : ''}`} onClick={() => setActiveOrder(o)}>
                  <td className="p-5" onClick={(e) => e.stopPropagation()}>
                    <input type="checkbox" checked={selectedIds.includes(o.id)} onChange={() => setSelectedIds(prev => prev.includes(o.id) ? prev.filter(id => id !== o.id) : [...prev, o.id])} className="accent-black" />
                  </td>
                  <td className="px-4 py-4">
                    <p className="font-black text-gray-400 text-sm line-through">#{o.id}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{fmt(o.created_at)}</p>
                  </td>
                  <td className="px-4 py-4">
                    <p className="text-sm font-black text-gray-500">{o.name}</p>
                    <p className="text-[10px] text-gray-400 font-bold">{o.city}</p>
                  </td>
                  <td className="px-4 py-4"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-4 text-right font-black text-gray-400 text-sm">QAR {o.total_price}</td>
                  <td className="px-4 py-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-2">
                      <button onClick={() => setConfirmDialog({ type: 'restore', ids: [o.id] })} className="p-2 bg-emerald-50 text-emerald-600 rounded-lg hover:bg-emerald-100 transition"><RotateCcw size={14} /></button>
                      <button onClick={() => setConfirmDialog({ type: 'purge', ids: [o.id] })} className="p-2 bg-rose-50 text-rose-500 rounded-lg hover:bg-rose-100 transition"><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && orders.length === 0 && (
            <div className="py-20 text-center">
              <History size={40} className="mx-auto text-gray-200 mb-4" />
              <p className="font-black text-gray-400 uppercase text-xs">No Archived Orders Found</p>
            </div>
          )}
        </div>
      </div>

      {/* PAGINATION */}
      {!loading && totalPages > 1 && (
        <div className="flex justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} className="p-2 rounded-xl border border-gray-200 hover:bg-black hover:text-white transition disabled:opacity-30" disabled={page === 1}><ChevronLeft size={16} /></button>
          <span className="px-4 py-2 text-[11px] font-black uppercase">Page {page} of {totalPages}</span>
          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} className="p-2 rounded-xl border border-gray-200 hover:bg-black hover:text-white transition disabled:opacity-30" disabled={page === totalPages}><ChevronRight size={16} /></button>
        </div>
      )}

      <HistoryDrawer order={activeOrder} onClose={() => setActiveOrder(null)} />

      <ConfirmDialog
        open={!!confirmDialog}
        title={confirmDialog?.type === 'restore' ? "Restore Order?" : "Permanent Delete?"}
        message={confirmDialog?.type === 'restore' 
          ? "This will move the selected order(s) back to the active list."
          : "Danger: This will erase this order data forever. You cannot undo this."}
        danger={confirmDialog?.type === 'purge'}
        confirmLabel={confirmDialog?.type === 'restore' ? "Restore" : "Delete Forever"}
        onConfirm={executeConfirm}
        onCancel={() => setConfirmDialog(null)}
      />
    </div>
  );
}