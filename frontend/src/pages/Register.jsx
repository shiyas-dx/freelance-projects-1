import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";

function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: ""
  });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      return toast.error("Passwords do not match!");
    }

    setLoading(true);
    try {
      // We don't send confirmPassword to the backend
      const { confirmPassword, ...submitData } = formData;
      await API.post("register/", submitData);
      toast.success("Welcome to LUXE! Please login.");
      navigate("/login");
    } catch (err) {
      toast.error(err.response?.data?.username?.[0] || "Registration failed.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">Join Luxe<span className="text-orange-600">.</span></h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">Create your member identity</p>
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <input
              type="text" placeholder="First Name" required
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
              onChange={(e) => setFormData({...formData, first_name: e.target.value})}
            />
            <input
              type="text" placeholder="Last Name" required
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
              onChange={(e) => setFormData({...formData, last_name: e.target.value})}
            />
          </div>

          <input
            type="text" placeholder="Username" required
            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
            onChange={(e) => setFormData({...formData, username: e.target.value})}
          />

          <input
            type="email" placeholder="Email Address" required
            className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
            onChange={(e) => setFormData({...formData, email: e.target.value})}
          />

          <div className="grid grid-cols-1 gap-4">
            <input
              type="password" placeholder="Password" required
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
              onChange={(e) => setFormData({...formData, password: e.target.value})}
            />
            <input
              type="password" placeholder="Confirm Password" required
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
            />
          </div>

          <button
            type="submit" disabled={loading}
            className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white bg-black hover:bg-orange-600 transition-all shadow-xl disabled:bg-gray-400 mt-4"
          >
            {loading ? "Verifying..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Member already? <Link to="/login" className="text-black underline">Sign In</Link>
        </p>
      </div>
    </div>
  );
}

export default Register;