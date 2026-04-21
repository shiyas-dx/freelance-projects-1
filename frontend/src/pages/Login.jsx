import { useState } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await API.post("login/", { username: email, password });
      
      // 1. Store tokens
      localStorage.setItem("access_token", res.data.access);
      localStorage.setItem("refresh_token", res.data.refresh);
      
      // 2. Store user role (Converted to string for the App.jsx AdminRoute check)
      localStorage.setItem("is_staff", String(res.data.is_staff)); 
      
      toast.success("Welcome back!");

      // 3. Conditional Redirect and State Refresh
      if (res.data.is_staff === true) {
        navigate("/admin");
      } else {
        navigate("/");
      }

      // 4. Force a reload to ensure the Protected Routes in App.jsx 
      // and the Navbar update with the new auth status immediately
      window.location.reload(); 

    } catch (err) {
      console.error("Login error:", err);
      toast.error("Invalid credentials. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">
            Sign In<span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            Access your member portal
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <input 
              type="text" 
              placeholder="Username or Email"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
              onChange={(e) => setEmail(e.target.value)} 
              required 
            />
          </div>
          <div>
            <input 
              type="password" 
              placeholder="Password"
              className="w-full px-5 py-4 rounded-2xl border border-gray-100 bg-gray-50 focus:bg-white focus:border-black outline-none transition-all text-sm font-bold"
              onChange={(e) => setPassword(e.target.value)} 
              required 
            />
            <div className="flex justify-end mt-2">
              <Link to="/forgot-password" core={14} className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600 transition-colors">
                Forgot Password?
              </Link>
            </div>
          </div>

          <button 
            disabled={loading}
            type="submit" 
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl disabled:bg-gray-400 mt-2"
          >
            {loading ? "Authorizing..." : "Login"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          New here? <Link to="/register" className="text-black underline">Create an account</Link>
        </p>
      </div>
    </div>
  );
}

export default Login;