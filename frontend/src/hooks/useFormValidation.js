// src/hooks/useFormValidation.js

export const validators = {
  first_name: (v = "") => {
    if (!v.trim()) return "First name is required.";
    if (v.trim().length < 2) return "Must be at least 2 characters.";
    return "";
  },
  last_name: (v = "") => {
    if (!v.trim()) return "Last name is required.";
    return "";
  },
  username: (v = "") => {
    if (!v.trim()) return "Username is required.";
    if (/\s/.test(v)) return "No spaces allowed.";
    if (!/^[a-zA-Z0-9._-]+$/.test(v)) return "Letters, numbers, . _ - only.";
    return "";
  },
  email: (v = "") => {
    if (!v.trim()) return "Email is required.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim())) return "Invalid email address.";
    return "";
  },
  password: (v = "") => {
    if (!v) return "Password is required.";
    if (v.length < 8) return "Min 8 characters.";
    if (!/[A-Z]/.test(v) || !/\d/.test(v)) return "Need uppercase & number.";
    return "";
  },
  confirmPassword: (v = "", password = "") => {
    if (!v) return "Confirm your password.";
    if (v !== password) return "Passwords do not match.";
    return "";
  },
  loginIdentifier: (v = "") => (!v.trim() ? "Required." : ""),
  loginPassword: (v = "") => (!v ? "Required." : ""),
};

export function getPasswordStrength(password = "") {
  if (!password) return { score: 0, label: "", color: "" };
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/\d/.test(password)) score++;
  if (/[!@#$%^&*]/.test(password)) score++;

  const levels = [
    { score: 0, label: "", color: "" },
    { score: 1, label: "Weak", color: "#ef4444" },
    { score: 2, label: "Fair", color: "#f97316" },
    { score: 3, label: "Good", color: "#eab308" },
    { score: 4, label: "Strong", color: "#22c55e" },
    { score: 5, label: "Elite", color: "#16a34a" },
  ];
  return levels[Math.min(score, 5)];
}

export function sanitizeField(name, value) {
  const skipTrim = ["password", "confirmPassword"];
  if (skipTrim.includes(name)) return value;
  return typeof value === "string" ? value.trimStart() : value;
}