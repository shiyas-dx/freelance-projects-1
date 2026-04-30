import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

function VerifyOTP() {
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const { state } = useLocation();
  const navigate = useNavigate();

  // If someone tries to visit this page directly without registering, send them back
  useEffect(() => {
    if (!state?.email) {
      navigate("/register");
    }
  }, [state, navigate]);

  const handleVerify = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await API.post("verify-otp/", { 
        email: state.email, 
        otp: otp 
      });
      toast.success("Identity Verified. Welcome to LUXE.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.error || "Invalid or expired code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 text-center">
        <div className="mb-8">
          <h2 className="text-3xl font-black italic tracking-tighter uppercase">
            Verify<span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            Secure code sent to {state?.email}
          </p>
        </div>

        <form onSubmit={handleVerify} className="space-y-6">
          <input
            type="text"
            maxLength="6"
            placeholder="000000"
            required
            className="w-full text-center text-5xl tracking-[0.4em] font-black py-6 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-black focus:bg-white transition-all"
            onChange={(e) => setOtp(e.target.value)}
          />
          
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl disabled:bg-gray-400"
          >
            {loading ? "Confirming..." : "Verify Account"}
          </button>
        </form>

        <p className="mt-8 text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Didn't get the code? <button onClick={() => window.location.reload()} className="text-black underline">Resend</button>
        </p>
      </div>
    </div>
  );
}

export default VerifyOTP;