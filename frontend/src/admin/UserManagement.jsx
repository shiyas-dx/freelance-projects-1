import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Users, Search, X, ShieldCheck, UserMinus, UserPlus, Trash2,
  Edit2, Loader2, AlertTriangle, Save, Plus
} from "lucide-react";
import API from "../services/api";
import toast from "react-hot-toast";

const BASE_URL = "http://127.0.0.1:8000"; // or use env

const getImg = (path) => {
  if (!path) return null;
  return path.startsWith("http") ? path : `${BASE_URL}${path}`;
};

function ConfirmDialog({ open, title, message, onConfirm, onCancel }) {
  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 z-50"
            onClick={onCancel}
          />
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
              <button
                onClick={onCancel}
                className="flex-1 py-3 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="flex-1 py-3 rounded-2xl bg-red-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-red-700 transition"
              >
                Delete Permanently
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

function UserEditModal({ open, onClose, user, onSave }) {
  const [form, setForm] = useState({
    first_name: "",
    last_name: "",
    email: "",
    is_staff: false,
  });
  const [profileForm, setProfileForm] = useState({
    phone: "",
    city: "",
  });
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (user) {
      setForm({
        first_name: user.first_name || "",
        last_name: user.last_name || "",
        email: user.email || "",
        is_staff: user.is_staff || false,
      });
      setProfileForm({
        phone: user.profile?.phone || "",
        city: user.profile?.city || "",
      });
      setPreview(null);
    }
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    Object.entries(profileForm).forEach(([k, v]) => fd.append(`profile.${k}`, v)); // Adjust if your serializer uses nested profile

    if (fileRef.current?.files[0]) {
      fd.append("profile.image", fileRef.current.files[0]); // Adjust field name if needed
    }

    try {
      const res = await API.patch(`all-users/${user.id}/`, fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      toast.success("User updated successfully");
      onSave(res.data);
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Update failed");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full bg-gray-50 border border-gray-200 focus:border-orange-400 focus:bg-white rounded-2xl px-4 py-3 text-sm font-bold outline-none transition-all placeholder-gray-300";

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* 1. Backdrop: Now uses Flexbox to center the modal safely */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 sm:p-6"
            onClick={onClose}
          >
            {/* 2. Modal Container: Removed translate-x/y logic */}
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 20 }}
              // Prevents clicking inside the modal from closing it
              onClick={(e) => e.stopPropagation()}
              className="relative bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            >
              {/* 3. Header: Stays fixed at the top */}
              <div className="flex items-center justify-between px-7 py-5 border-b border-gray-100 bg-white">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                    EDIT USER
                  </p>
                  <h2 className="text-2xl font-black uppercase italic tracking-tighter">
                    {user?.username}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              {/* 4. Scrollable Content Area: The form lives here */}
              <div className="overflow-y-auto flex-1 custom-scrollbar">
                <form onSubmit={handleSubmit} className="p-7 space-y-6">
                  {/* Avatar Upload */}
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                      Profile Image
                    </label>
                    <div
                      onClick={() => fileRef.current?.click()}
                      className="relative w-28 h-28 mx-auto rounded-2xl overflow-hidden bg-gray-50 border-2 border-dashed border-gray-200 hover:border-orange-400 cursor-pointer flex items-center justify-center transition-colors"
                    >
                      {preview || getImg(user?.profile?.image) ? (
                        <img
                          src={preview || getImg(user?.profile?.image)}
                          className="w-full h-full object-cover"
                          alt=""
                        />
                      ) : (
                        <div className="text-gray-300">
                          <Plus size={32} />
                        </div>
                      )}
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

                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        First Name
                      </label>
                      <input
                        className={inputCls}
                        value={form.first_name}
                        onChange={(e) =>
                          setForm({ ...form, first_name: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Last Name
                      </label>
                      <input
                        className={inputCls}
                        value={form.last_name}
                        onChange={(e) =>
                          setForm({ ...form, last_name: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                      Email
                    </label>
                    <input
                      type="email"
                      className={inputCls}
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                    />
                  </div>

                  {/* Profile Fields */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        Phone
                      </label>
                      <input
                        className={inputCls}
                        value={profileForm.phone}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, phone: e.target.value })
                        }
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">
                        City
                      </label>
                      <input
                        className={inputCls}
                        value={profileForm.city}
                        onChange={(e) =>
                          setProfileForm({ ...profileForm, city: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {/* Role Toggle */}
                  <div className="flex items-center justify-between bg-gray-50 p-4 rounded-2xl">
                    <div>
                      <p className="font-bold">Admin Privileges</p>
                      <p className="text-xs text-gray-500">Grant staff access</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setForm({ ...form, is_staff: !form.is_staff })}
                      className={`w-12 h-6 rounded-full relative transition-colors ${
                        form.is_staff ? "bg-orange-600" : "bg-gray-200"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                          form.is_staff ? "translate-x-7" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>

                  {/* Action Buttons: These will now stay at the bottom of the scroll */}
                  <div className="flex gap-3 pt-4 sticky bottom-0 bg-white pb-2">
                    <button
                      type="button"
                      onClick={onClose}
                      className="flex-1 py-4 rounded-2xl border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={saving}
                      className="flex-1 py-4 rounded-2xl bg-black text-white text-[10px] font-black uppercase tracking-widest hover:bg-orange-600 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                      {saving ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Save size={14} />
                      )}
                      {saving ? "Saving..." : "Save Changes"}
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

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState(""); // "" | "staff" | "normal"
  const [editUser, setEditUser] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const debouncedSearch = React.useMemo(() => search.toLowerCase().trim(), [search]); // simple debounce simulation; add useDebounce if needed

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await API.get("all-users/");
      setUsers(Array.isArray(res.data) ? res.data : []);
    } catch (err) {
      toast.error("Failed to load users. Ensure you are logged in as Admin.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = users.filter((u) => {
    const term = debouncedSearch;
    const matchesSearch =
      (u.username?.toLowerCase() || "").includes(term) ||
      (u.email?.toLowerCase() || "").includes(term) ||
      (u.first_name?.toLowerCase() || "").includes(term) ||
      (u.last_name?.toLowerCase() || "").includes(term);

    const matchesRole =
      roleFilter === "" ||
      (roleFilter === "staff" && u.is_staff) ||
      (roleFilter === "normal" && !u.is_staff);

    return matchesSearch && matchesRole;
  });

  const toggleStaff = async (user) => {
    try {
      await API.patch(`all-users/${user.id}/`, { is_staff: !user.is_staff });
      toast.success(`${user.username} ${user.is_staff ? "demoted" : "promoted to Admin"}`);
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_staff: !user.is_staff } : u)));
    } catch {
      toast.error("Failed to update role");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await API.delete(`all-users/${deleteId}/`);
      setUsers((prev) => prev.filter((u) => u.id !== deleteId));
      toast.success("User deleted permanently");
    } catch {
      toast.error("Delete failed");
    } finally {
      setDeleteId(null);
    }
  };

  const handleSaveEdit = (updatedUser) => {
    setUsers((prev) => prev.map((u) => (u.id === updatedUser.id ? updatedUser : u)));
  };

  return (
    <div className="space-y-8 p-2">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-4xl font-black italic uppercase tracking-tighter">
            Community<span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-1">
            Managing {users.length} registered accounts
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 p-4 flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
          <input
            type="text"
            placeholder="Search by name, username or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-11 pr-10 py-3.5 bg-gray-50 border border-gray-100 rounded-2xl text-sm font-bold outline-none focus:border-orange-400 focus:bg-white"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700">
              <X size={14} />
            </button>
          )}
        </div>

        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="bg-gray-50 border border-gray-100 px-5 py-3.5 rounded-2xl text-sm font-bold outline-none focus:border-orange-400 focus:bg-white"
        >
          <option value="">All Roles</option>
          <option value="staff">Admins Only</option>
          <option value="normal">Regular Users</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-3xl overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-24 flex justify-center">
            <Loader2 size={32} className="animate-spin text-gray-300" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="py-24 text-center">
            <Users size={48} className="mx-auto text-gray-200 mb-4" />
            <p className="font-black uppercase tracking-widest text-gray-400">No users match your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px]">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/80">
                  <th className="px-6 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">User</th>
                  <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Contact</th>
                  <th className="px-4 py-5 text-left text-[10px] font-black uppercase tracking-widest text-gray-400">Joined</th>
                  <th className="px-4 py-5 text-center text-[10px] font-black uppercase tracking-widest text-gray-400">Role</th>
                  <th className="px-6 py-5 text-right text-[10px] font-black uppercase tracking-widest text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                <AnimatePresence mode="popLayout">
                  {filteredUsers.map((u, idx) => (
                    <motion.tr
                      key={u.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ delay: idx * 0.02 }}
                      className="group hover:bg-orange-50/30 transition-colors"
                    >
                      <td className="px-6 py-5">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 flex-shrink-0">
                            {getImg(u.profile?.image) ? (
                              <img src={getImg(u.profile?.image)} alt="" className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center"><Users size={22} className="text-gray-300" /></div>
                            )}
                          </div>
                          <div>
                            <p className="font-black text-gray-900 group-hover:text-orange-600 transition-colors">
                              {u.first_name && u.last_name ? `${u.first_name} ${u.last_name}` : u.username}
                            </p>
                            <p className="text-xs text-gray-500 font-mono">@{u.username}</p>
                          </div>
                        </div>
                      </td>

                      <td className="px-4 py-5 text-sm">
                        <div>{u.email || "—"}</div>
                        <div className="text-xs text-gray-500">{u.profile?.phone || "No phone"}</div>
                      </td>

                      <td className="px-4 py-5 text-sm text-gray-600">
                        {new Date(u.date_joined).toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })}
                      </td>

                      <td className="px-4 py-5 text-center">
                        {u.is_staff ? (
                          <div className="inline-flex items-center gap-1.5 px-4 py-1 bg-black text-white text-[10px] font-black uppercase rounded-full">
                            <ShieldCheck size={12} className="text-orange-500" /> ADMIN
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-4 py-1 bg-gray-100 text-gray-600 text-[10px] font-black uppercase rounded-full">
                            USER
                          </div>
                        )}
                      </td>

                      <td className="px-6 py-5 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-80 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => toggleStaff(u)}
                            className={`px-4 py-2 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${
                              u.is_staff
                                ? "bg-red-50 text-red-600 hover:bg-red-100"
                                : "bg-gray-100 text-black hover:bg-black hover:text-white"
                            }`}
                          >
                            {u.is_staff ? <UserMinus size={14} /> : <UserPlus size={14} />}
                            {u.is_staff ? "Demote" : "Make Admin"}
                          </button>

                          <button
                            onClick={() => setEditUser(u)}
                            className="p-3 rounded-2xl border border-gray-100 hover:bg-black hover:text-white hover:border-black transition-all"
                            title="Edit full details"
                          >
                            <Edit2 size={15} />
                          </button>

                          <button
                            onClick={() => setDeleteId(u.id)}
                            className="p-3 rounded-2xl border border-gray-100 hover:bg-red-600 hover:text-white hover:border-red-600 transition-all text-gray-400 hover:text-white"
                            title="Delete user"
                          >
                            <Trash2 size={15} />
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
      </div>

      {/* Modals */}
      <UserEditModal
        open={!!editUser}
        onClose={() => setEditUser(null)}
        user={editUser}
        onSave={handleSaveEdit}
      />

      <ConfirmDialog
        open={!!deleteId}
        title="Delete User Account"
        message="This action is permanent and cannot be undone. All associated data will be lost."
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}