import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { ArrowLeft } from "lucide-react";

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("password-reset/", { email }); 
      toast.success("Security code sent!");
      // Step 1 -> Step 2: Pass email to the OTP page
      navigate("/verify-reset-otp", { state: { email } });
    } catch (err) {
      toast.error("User with this email not found.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
        <Link to="/login" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-black mb-8 transition-colors">
          <ArrowLeft size={14} /> Back to Login
        </Link>
        <div className="mb-10">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">Recover Access<span className="text-orange-600">.</span></h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2 leading-relaxed">Enter your email to receive a 6-digit code.</p>
        </div>
        <form onSubmit={handleSubmit} className="space-y-6">
          <input 
            type="email" placeholder="Email Address" required
            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
            value={email} onChange={(e) => setEmail(e.target.value)} 
          />
          <button disabled={loading} type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl">
            {loading ? "Sending..." : "Request Code"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default ForgotPassword;