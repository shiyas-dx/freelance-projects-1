import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

function PasswordResetConfirm() {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ new_password: "", confirm_password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.new_password !== formData.confirm_password) {
      return toast.error("Passwords do not match.");
    }

    setLoading(true);
    try {
      // Use the OTP we carried over from the previous step
      await API.post("password-reset-confirm/", {
        email: state?.email,
        otp: state?.otp, 
        new_password: formData.new_password,
      });
      toast.success("Password Updated! Please login.");
      navigate("/login");
    } catch (err) {
      toast.error("Session expired. Please start again.");
      navigate("/forgot-password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">New Password<span className="text-orange-600">.</span></h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Secure your account access</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password" placeholder="New Password" required
            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
            onChange={(e) => setFormData({ ...formData, new_password: e.target.value })}
          />
          <input
            type="password" placeholder="Confirm Password" required
            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
            onChange={(e) => setFormData({ ...formData, confirm_password: e.target.value })}
          />
          <button type="submit" disabled={loading} className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white bg-black hover:bg-orange-600 transition-all shadow-xl">
            {loading ? "Updating..." : "Reset Password"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default PasswordResetConfirm;