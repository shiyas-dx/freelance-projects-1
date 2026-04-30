import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

function VerifyResetOTP() {
  const { state } = useLocation();
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

const handleVerify = async (e) => {
  e.preventDefault();
  setLoading(true);
  try {
    // Ensure both email and otp are sent
    await API.post("verify-reset-otp/", { 
      email: state?.email, 
      otp: otp.trim() 
    });
    
    toast.success("Identity Confirmed.");
    // Step 2 -> Step 3: Pass both to the final page
    navigate("/new-password", { state: { email: state?.email, otp: otp } });
  } catch (err) {
    // This will now show the specific error from the backend
    toast.error(err.response?.data?.error || "Invalid code.");
  } finally {
    setLoading(false);
  }
};

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100 text-center">
        <h2 className="text-3xl font-black italic uppercase mb-4">Verify Code<span className="text-orange-600">.</span></h2>
        <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mb-8">Enter the code sent to {state?.email}</p>
        <form onSubmit={handleVerify} className="space-y-6">
          <input 
            type="text" placeholder="000000" maxLength="6" required
            className="w-full text-center text-4xl tracking-[0.5em] font-black py-4 rounded-2xl bg-gray-50 border border-gray-100 outline-none focus:border-black"
            onChange={(e) => setOtp(e.target.value)} 
          />
          <button disabled={loading} type="submit" className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-widest hover:bg-orange-600 transition-all">
            {loading ? "Verifying..." : "Continue"}
          </button>
        </form>
      </div>
    </div>
  );
}
export default VerifyResetOTP;