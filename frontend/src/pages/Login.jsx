import { useState, useCallback } from "react";
import API from "../services/api";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import { validators, sanitizeField } from "../hooks/useFormValidation";

/* ── field error display ── */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
      <span aria-hidden="true">⚠</span> {msg}
    </p>
  );
}

/* ═══════════════════════════════════════════
   LOGIN COMPONENT
═══════════════════════════════════════════ */
function Login() {
  const [fields, setFields] = useState({ identifier: "", password: "" });
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [loading, setLoading] = useState(false);

  // Rate-limit state: track failed attempts to show lockout feedback
  const [failCount, setFailCount]       = useState(0);
  const [lockedUntil, setLockedUntil]   = useState(null); // timestamp ms
  const LOCKOUT_AFTER   = 5;     // attempts before soft lockout
  const LOCKOUT_SECONDS = 30;    // seconds to wait

  const navigate = useNavigate();

  /* ── save to localStorage ── */
  const saveUserToStorage = (accessToken, refreshToken, user) => {
    localStorage.setItem("access_token",  accessToken);
    if (refreshToken) localStorage.setItem("refresh_token", refreshToken);
    localStorage.setItem("is_staff",   String(user?.is_staff  || false));
    localStorage.setItem("user_name",  user?.name     || user?.username || "User");
    localStorage.setItem("user_email", user?.email    || "");
  };

  /* ── field validation ── */
  const validateField = useCallback((name, value) => {
    const ruleMap = {
      identifier: validators.loginIdentifier,
      password:   validators.loginPassword,
    };
    const error = ruleMap[name]?.(value) ?? "";
    setErrors((prev) => ({ ...prev, [name]: error }));
    return error;
  }, []);

  const validateAll = useCallback(() => {
    const identifierErr = validators.loginIdentifier(fields.identifier);
    const passwordErr   = validators.loginPassword(fields.password);
    const newErrors     = { identifier: identifierErr, password: passwordErr };
    setErrors(newErrors);
    setTouched({ identifier: true, password: true });
    return !identifierErr && !passwordErr;
  }, [fields]);

  const handleChange = (name, value) => {
    const clean = sanitizeField(name, value);
    setFields((prev) => ({ ...prev, [name]: clean }));
    if (touched[name]) validateField(name, clean);
  };

  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, fields[name]);
  };

  const showError = (name) => touched[name] && errors[name];

  const inputCls = (name) =>
    `w-full px-5 py-4 rounded-2xl border bg-gray-50 focus:bg-white outline-none transition-all text-sm font-bold
    ${
      showError(name)
        ? "border-red-400 focus:border-red-500"
        : touched[name] && !errors[name]
        ? "border-green-400 focus:border-green-500"
        : "border-gray-100 focus:border-black"
    }`;

  /* ── lockout check ── */
  const isLockedOut = () => lockedUntil && Date.now() < lockedUntil;

  const getRemainingSeconds = () =>
    lockedUntil ? Math.ceil((lockedUntil - Date.now()) / 1000) : 0;

  /* ── Google login ── */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await API.post("auth/google/", {
          access_token: tokenResponse.access_token,
        });

        const accessToken  = res.data?.access || res.data?.access_token;
        const refreshToken = res.data?.refresh;
        const user         = res.data?.user;

        if (!accessToken) throw new Error("No access token returned from backend");

        saveUserToStorage(accessToken, refreshToken, user);

        toast.success(`Welcome, ${user?.name || user?.username || "Luxe Member"}!`);
        navigate(user?.is_staff ? "/admin" : "/");
        window.location.reload();
      } catch (err) {
        const msg =
          err.response?.data?.non_field_errors?.[0] ||
          err.response?.data?.detail ||
          "Google authentication failed.";
        toast.error(msg);
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Google Login Failed"),
  });

  /* ── Email / Username login ── */
  const handleLogin = async (e) => {
    e.preventDefault();

    if (isLockedOut()) {
      toast.error(`Too many failed attempts. Wait ${getRemainingSeconds()}s.`);
      return;
    }

    if (!validateAll()) {
      toast.error("Please fill in all required fields.");
      return;
    }

    setLoading(true);
    try {
      const res = await API.post("login/", {
        username: fields.identifier.trim(),
        password: fields.password,
      });

      saveUserToStorage(res.data.access, res.data.refresh, {
        is_staff: res.data.is_staff,
        name:     res.data.name     || res.data.username || fields.identifier,
        email:    res.data.email    || "",
        username: res.data.username || fields.identifier,
      });

      // Reset fail state on success
      setFailCount(0);
      setLockedUntil(null);

      toast.success("Welcome back!");
      navigate(res.data.is_staff === true ? "/admin" : "/");
      window.location.reload();

    } catch (err) {
      const status = err.response?.status;
      const newCount = failCount + 1;
      setFailCount(newCount);

      if (status === 401 || status === 400) {
        if (newCount >= LOCKOUT_AFTER) {
          const until = Date.now() + LOCKOUT_SECONDS * 1000;
          setLockedUntil(until);
          setFailCount(0);
          toast.error(
            `Too many failed attempts. Please wait ${LOCKOUT_SECONDS} seconds.`
          );
        } else {
          const remaining = LOCKOUT_AFTER - newCount;
          toast.error(
            `Invalid credentials. ${remaining} attempt${remaining !== 1 ? "s" : ""} remaining before lockout.`
          );
          // Show generic field-level error to nudge the user
          setErrors((prev) => ({
            ...prev,
            password: "Incorrect username/email or password.",
          }));
          setTouched((prev) => ({ ...prev, password: true }));
        }
      } else if (status === 403) {
        toast.error(
          err.response?.data?.detail || "Account is disabled. Contact support."
        );
      } else if (status === 429) {
        toast.error("Too many requests. Please try again later.");
      } else {
        toast.error("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-10">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">

        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">
            Sign In<span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            Access your Luxe portal
          </p>
        </div>

        {/* Lockout banner */}
        {isLockedOut() && (
          <div className="mb-6 px-5 py-4 rounded-2xl bg-red-50 border border-red-200 text-[10px] font-black uppercase tracking-widest text-red-600 text-center">
            Account temporarily locked. Try again in{" "}
            {getRemainingSeconds()} seconds.
          </div>
        )}

        {/* Google */}
          <button
            type="button"
            onClick={() => googleLogin()}
            disabled={loading}
            className="w-full flex items-center justify-center gap-[10px] bg-white border border-[#dadce0] text-[#3c4043] h-10 px-3 rounded font-medium text-sm tracking-[0.01em] shadow-[0_1px_2px_rgba(60,64,67,0.08),0_1px_3px_rgba(60,64,67,0.12)] hover:bg-[#f8faff] hover:shadow-[0_1px_3px_rgba(60,64,67,0.15),0_2px_6px_rgba(60,64,67,0.15)] transition-all disabled:opacity-50 rounded-2xl"
            style={{ fontFamily: "'Roboto', Arial, sans-serif" }}
          >
            <svg className="w-[18px] h-[18px] shrink-0" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Continue with Google
          </button>

        <div className="relative mb-8 text-center">
          <hr className="border-gray-100" />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-white px-4 text-[8px] font-black uppercase tracking-[0.3em] text-gray-300">
            OR
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-5" noValidate>
          <div>
            <input
              type="text"
              placeholder="Username or Email"
              autoComplete="username"
              className={inputCls("identifier")}
              value={fields.identifier}
              onChange={(e) => handleChange("identifier", e.target.value)}
              onBlur={() => handleBlur("identifier")}
              maxLength={254}
              aria-invalid={!!showError("identifier")}
              aria-describedby={showError("identifier") ? "err-identifier" : undefined}
            />
            <div id="err-identifier">
              <FieldError msg={showError("identifier") ? errors.identifier : ""} />
            </div>
          </div>

          <div>
            <input
              type="password"
              placeholder="Password"
              autoComplete="current-password"
              className={inputCls("password")}
              value={fields.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              maxLength={128}
              aria-invalid={!!showError("password")}
              aria-describedby={showError("password") ? "err-password" : undefined}
            />
            <div id="err-password">
              <FieldError msg={showError("password") ? errors.password : ""} />
            </div>
          </div>

          <div className="flex justify-end">
            <Link
              to="/forgot-password"
              className="text-[10px] font-black uppercase tracking-widest text-gray-400 hover:text-orange-600 transition-colors"
            >
              Forgot Password?
            </Link>
          </div>

          <button
            type="submit"
            disabled={loading || isLockedOut()}
            className="w-full bg-black text-white py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] hover:bg-orange-600 transition-all shadow-xl disabled:bg-gray-400"
          >
            {loading ? "Authorizing..." : isLockedOut() ? `Locked (${getRemainingSeconds()}s)` : "Login"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          New here?{" "}
          <Link to="/register" className="text-black underline">
            Create account
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Login;