import { useState, useCallback } from "react";
import { useNavigate, Link } from "react-router-dom";
import API from "../services/api";
import toast from "react-hot-toast";
import { useGoogleLogin } from "@react-oauth/google";
import {
  validators,
  getPasswordStrength,
  sanitizeField,
} from "../hooks/useFormValidation";

/* ── tiny helper: render one field error ── */
function FieldError({ msg }) {
  if (!msg) return null;
  return (
    <p className="mt-1 text-[10px] font-bold text-red-500 uppercase tracking-wider flex items-center gap-1">
      <span aria-hidden="true">⚠</span> {msg}
    </p>
  );
}

/* ── password strength bar ── */
function StrengthBar({ password }) {
  const { score, label, color } = getPasswordStrength(password);
  if (!password) return null;

  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((i) => (
          <div
            key={i}
            className="h-1 flex-1 rounded-full transition-all duration-300"
            style={{ backgroundColor: i <= score ? color : "#e5e7eb" }}
          />
        ))}
      </div>
      {label && (
        <p
          className="text-[10px] font-black uppercase tracking-widest"
          style={{ color }}
        >
          {label}
        </p>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════
   REGISTER COMPONENT
═══════════════════════════════════════════ */
function Register() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    first_name: "",
    last_name: "",
  });

  // Which fields the user has touched (to show errors only after interaction)
  const [touched, setTouched] = useState({});
  // Field-level error map
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  // Track how many times submit was attempted (for server-side rate-limit UX)
  const [submitCount, setSubmitCount] = useState(0);
  const navigate = useNavigate();

  /* ── validate a single field and update errors state ── */
  const validateField = useCallback(
    (name, value) => {
      let error = "";

      if (name === "confirmPassword") {
        error = validators.confirmPassword(value, formData.password);
      } else if (validators[name]) {
        error = validators[name](value);
      }

      setErrors((prev) => ({ ...prev, [name]: error }));
      return error;
    },
    [formData.password]
  );

  /* ── validate entire form; returns true if clean ── */
  const validateAll = useCallback(() => {
    const fields = [
      "first_name",
      "last_name",
      "username",
      "email",
      "password",
      "confirmPassword",
    ];
    let allValid = true;
    const newErrors = {};
    const newTouched = {};

    fields.forEach((name) => {
      let error = "";
      if (name === "confirmPassword") {
        error = validators.confirmPassword(
          formData[name],
          formData.password
        );
      } else {
        error = validators[name]?.(formData[name]) ?? "";
      }
      newErrors[name] = error;
      newTouched[name] = true;
      if (error) allValid = false;
    });

    setErrors(newErrors);
    setTouched(newTouched);
    return allValid;
  }, [formData]);

  /* ── onChange: sanitise → store → validate if touched ── */
  const handleChange = (name, value) => {
    const clean = sanitizeField(name, value);
    setFormData((prev) => ({ ...prev, [name]: clean }));
    if (touched[name]) validateField(name, clean);

    // Re-validate confirmPassword live if password changes
    if (name === "password" && touched.confirmPassword) {
      const cpError = validators.confirmPassword(
        formData.confirmPassword,
        clean
      );
      setErrors((prev) => ({ ...prev, confirmPassword: cpError }));
    }
  };

  /* ── onBlur: mark touched and validate ── */
  const handleBlur = (name) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    validateField(name, formData[name]);
  };

  /* ── check if a field should show its error ── */
  const showError = (name) => touched[name] && errors[name];

  /* ── input class helper ── */
  const inputCls = (name) =>
    `w-full px-5 py-4 rounded-2xl border bg-gray-50 focus:bg-white outline-none transition-all text-sm font-bold
    ${
      showError(name)
        ? "border-red-400 focus:border-red-500"
        : touched[name] && !errors[name]
        ? "border-green-400 focus:border-green-500"
        : "border-gray-100 focus:border-black"
    }`;

  /* ── Google handler ── */
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true);
      try {
        const res = await API.post("auth/google/", {
          access_token: tokenResponse.access_token,
        });

        localStorage.setItem("access_token", res.data.access);
        localStorage.setItem("refresh_token", res.data.refresh);
        localStorage.setItem("is_staff", String(res.data.user.is_staff));
        localStorage.setItem("username", res.data.user.username);

        toast.success(`Welcome to Luxe, ${res.data.user.username}!`);
        navigate(res.data.user.is_staff ? "/admin" : "/");
        window.location.reload();
      } catch (err) {
        console.error("Google Auth error:", err);
        toast.error("Google authentication failed.");
      } finally {
        setLoading(false);
      }
    },
    onError: () => toast.error("Google Registration Failed"),
  });

  /* ── Submit ── */
  const handleRegister = async (e) => {
    e.preventDefault();
    setSubmitCount((n) => n + 1);

    if (!validateAll()) {
      toast.error("Please fix the errors before submitting.");
      return;
    }

    // Soft client-side rate limiting: warn after 5 rapid attempts
    if (submitCount >= 5) {
      toast.error("Too many attempts. Please wait a moment.");
      return;
    }

    setLoading(true);
    try {
      // eslint-disable-next-line no-unused-vars
      const { confirmPassword, ...submitData } = formData;
      // Final trim of all text fields before sending
      const sanitized = Object.fromEntries(
        Object.entries(submitData).map(([k, v]) =>
          k !== "password" && typeof v === "string"
            ? [k, v.trim()]
            : [k, v]
        )
      );

      await API.post("register/", sanitized);

      toast.success("Security code sent to your email!");
      navigate("/verify-otp", { state: { email: formData.email.trim() } });
    } catch (err) {
      const data = err.response?.data;

      // Map server field errors back into the UI
      if (data) {
        const serverErrors = {};
        const fieldMap = {
          username: "username",
          email: "email",
          password: "password",
          first_name: "first_name",
          last_name: "last_name",
        };
        let hasFieldError = false;

        Object.entries(fieldMap).forEach(([serverKey, stateKey]) => {
          if (data[serverKey]?.[0]) {
            serverErrors[stateKey] = data[serverKey][0];
            hasFieldError = true;
          }
        });

        if (Object.keys(serverErrors).length) {
          setErrors((prev) => ({ ...prev, ...serverErrors }));
          setTouched((prev) =>
            Object.fromEntries(
              Object.keys(serverErrors).map((k) => [k, true])
            )
          );
        }

        if (!hasFieldError) {
          const msg =
            data.non_field_errors?.[0] ||
            data.detail ||
            "Registration failed. Please try again.";
          toast.error(msg);
        } else {
          toast.error("Please fix the highlighted errors.");
        }
      } else {
        toast.error("Network error. Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <div className="max-w-md w-full bg-white rounded-[2.5rem] shadow-2xl p-10 border border-gray-100">
        {/* Header */}
        <div className="text-center mb-10">
          <h2 className="text-4xl font-black italic tracking-tighter uppercase">
            Join Luxe<span className="text-orange-600">.</span>
          </h2>
          <p className="text-gray-400 text-[10px] font-bold uppercase tracking-widest mt-2">
            Create your member identity
          </p>
        </div>

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
        <form onSubmit={handleRegister} className="space-y-4" noValidate>
          {/* First / Last Name */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <input
                type="text"
                placeholder="First Name"
                autoComplete="given-name"
                className={inputCls("first_name")}
                value={formData.first_name}
                onChange={(e) => handleChange("first_name", e.target.value)}
                onBlur={() => handleBlur("first_name")}
                aria-invalid={!!showError("first_name")}
                aria-describedby={showError("first_name") ? "err-first_name" : undefined}
              />
              <div id="err-first_name">
                <FieldError msg={showError("first_name") ? errors.first_name : ""} />
              </div>
            </div>
            <div>
              <input
                type="text"
                placeholder="Last Name"
                autoComplete="family-name"
                className={inputCls("last_name")}
                value={formData.last_name}
                onChange={(e) => handleChange("last_name", e.target.value)}
                onBlur={() => handleBlur("last_name")}
                aria-invalid={!!showError("last_name")}
                aria-describedby={showError("last_name") ? "err-last_name" : undefined}
              />
              <div id="err-last_name">
                <FieldError msg={showError("last_name") ? errors.last_name : ""} />
              </div>
            </div>
          </div>

          {/* Username */}
          <div>
            <input
              type="text"
              placeholder="Username"
              autoComplete="username"
              className={inputCls("username")}
              value={formData.username}
              onChange={(e) => handleChange("username", e.target.value)}
              onBlur={() => handleBlur("username")}
              maxLength={30}
              aria-invalid={!!showError("username")}
              aria-describedby={showError("username") ? "err-username" : undefined}
            />
            <div id="err-username">
              <FieldError msg={showError("username") ? errors.username : ""} />
            </div>
          </div>

          {/* Email */}
          <div>
            <input
              type="email"
              placeholder="Email Address"
              autoComplete="email"
              className={inputCls("email")}
              value={formData.email}
              onChange={(e) => handleChange("email", e.target.value)}
              onBlur={() => handleBlur("email")}
              maxLength={254}
              aria-invalid={!!showError("email")}
              aria-describedby={showError("email") ? "err-email" : undefined}
            />
            <div id="err-email">
              <FieldError msg={showError("email") ? errors.email : ""} />
            </div>
          </div>

          {/* Password */}
          <div>
            <input
              type="password"
              placeholder="Password"
              autoComplete="new-password"
              className={inputCls("password")}
              value={formData.password}
              onChange={(e) => handleChange("password", e.target.value)}
              onBlur={() => handleBlur("password")}
              maxLength={128}
              aria-invalid={!!showError("password")}
              aria-describedby="err-password pwd-strength"
            />
            <div id="pwd-strength">
              <StrengthBar password={formData.password} />
            </div>
            <div id="err-password">
              <FieldError msg={showError("password") ? errors.password : ""} />
            </div>
          </div>

          {/* Confirm Password */}
          <div>
            <input
              type="password"
              placeholder="Confirm Password"
              autoComplete="new-password"
              className={inputCls("confirmPassword")}
              value={formData.confirmPassword}
              onChange={(e) => handleChange("confirmPassword", e.target.value)}
              onBlur={() => handleBlur("confirmPassword")}
              maxLength={128}
              aria-invalid={!!showError("confirmPassword")}
              aria-describedby={showError("confirmPassword") ? "err-confirm" : undefined}
            />
            <div id="err-confirm">
              <FieldError msg={showError("confirmPassword") ? errors.confirmPassword : ""} />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] text-white bg-black hover:bg-orange-600 transition-all shadow-xl disabled:bg-gray-400 mt-4"
          >
            {loading ? "Initializing..." : "Create Account"}
          </button>
        </form>

        <p className="mt-8 text-center text-[10px] font-bold uppercase tracking-widest text-gray-400">
          Member already?{" "}
          <Link to="/login" className="text-black underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}

export default Register;