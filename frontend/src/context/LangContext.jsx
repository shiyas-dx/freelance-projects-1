/**
 * LangContext.jsx
 * ─────────────────────────────────────────────────────────────
 * Self-contained i18n system. No external library required.
 *
 * Features:
 *  • English (LTR) + Arabic (RTL)
 *  • Auto-flips document direction + lang attribute
 *  • Loads Arabic font (Cairo) from Google Fonts dynamically
 *  • Persists choice in localStorage
 *  • useLang() hook usable anywhere in the app
 *  • t() translation function with interpolation support
 *
 * Usage:
 *   import { useLang } from "../context/LangContext";
 *   const { t, isRTL, lang, setLang } = useLang();
 *   <p>{t("home")}</p>
 *   <p>{t("greeting", { name: "Ali" })}</p>   // if key contains {name}
 * ─────────────────────────────────────────────────────────────
 */

import { createContext, useContext, useState, useEffect, useCallback } from "react";

/* ── Translations ───────────────────────────────────────────── */
const TRANSLATIONS = {
  en: {
    // Nav
    home:           "Home",
    shopAll:        "Shop All",
    categories:     "Categories",
    searchShort:    "Search…",
    searchLong:     "Find your style…",
    login:          "Login",
    join:           "Join",
    profile:        "Profile",
    myOrders:       "My Orders",
    wishlist:       "Wishlist",
    settings:       "Settings",
    logout:         "Logout",
    cart:           "Cart",
    welcomeBack:    "Welcome back",
    active:         "Active",

    // Search dropdown
    products:       "Products",
    viewAllResults: 'View all results for "{query}"',
    noResults:      'No results for "{query}"',
    tryOther:       "Try a different search term",

    // Announcement
    freeShipping:   "Free Shipping & Fast Delivery",

    // Shop / Product
    addToCart:      "Add to Cart",
    buyNow:         "Buy Now",
    outOfStock:     "Out of Stock",
    price:          "Price",
    quantity:       "Quantity",
    description:    "Description",
    relatedProducts:"Related Products",
    newArrival:     "New Arrival",

    // Cart
    yourCart:       "Your Cart",
    emptyCart:      "Your cart is empty",
    subtotal:       "Subtotal",
    checkout:       "Checkout",
    remove:         "Remove",
    continueShopping:"Continue Shopping",

    // Checkout
    orderSummary:   "Order Summary",
    placeOrder:     "Place Order",
    fullName:       "Full Name",
    phone:          "Phone",
    address:        "Address",
    city:           "City",
    pinCode:        "PIN Code",
    paymentMethod:  "Payment Method",
    cashOnDelivery: "Cash on Delivery",

    // Auth
    emailAddress:   "Email Address",
    password:       "Password",
    confirmPassword:"Confirm Password",
    forgotPassword: "Forgot Password?",
    noAccount:      "Don't have an account?",
    hasAccount:     "Already have an account?",
    registerNow:    "Register Now",
    loginNow:       "Login Now",
    orContinueWith: "Or continue with",

    // Profile
    myAccount:      "My Account",
    orderHistory:   "Order History",
    accountSettings:"Account Settings",

    // Admin
    dashboard:      "Dashboard",
    orderManagement:"Order Management",
    confirmQueue:   "Confirm Queue",
    orderHistoryAdmin:"Order History",
    userManagement: "User Management",
    productManagement:"Products",
    media:          "Media",

    // General
    loading:        "Loading…",
    save:           "Save",
    cancel:         "Cancel",
    confirm:        "Confirm",
    delete:         "Delete",
    edit:           "Edit",
    back:           "Back",
    next:           "Next",
    previous:       "Previous",
    search:         "Search",
    filter:         "Filter",
    clear:          "Clear",
    refresh:        "Refresh",
    noData:         "No data found",
    error:          "Something went wrong",
  },

  ar: {
    // Nav
    home:           "الرئيسية",
    shopAll:        "تسوق الكل",
    categories:     "الفئات",
    searchShort:    "بحث…",
    searchLong:     "ابحث عن ستايلك…",
    login:          "تسجيل الدخول",
    join:           "انضم",
    profile:        "الملف الشخصي",
    myOrders:       "طلباتي",
    wishlist:       "المفضلة",
    settings:       "الإعدادات",
    logout:         "تسجيل الخروج",
    cart:           "السلة",
    welcomeBack:    "أهلاً بعودتك",
    active:         "نشط",

    // Search dropdown
    products:       "المنتجات",
    viewAllResults: 'عرض كل نتائج "{query}"',
    noResults:      'لا نتائج لـ "{query}"',
    tryOther:       "جرّب كلمة بحث مختلفة",

    // Announcement
    freeShipping:   "شحن مجاني وتوصيل سريع",

    // Shop / Product
    addToCart:      "أضف إلى السلة",
    buyNow:         "اشترِ الآن",
    outOfStock:     "نفد من المخزون",
    price:          "السعر",
    quantity:       "الكمية",
    description:    "الوصف",
    relatedProducts:"منتجات مشابهة",
    newArrival:     "وصل حديثاً",

    // Cart
    yourCart:       "سلة التسوق",
    emptyCart:      "سلتك فارغة",
    subtotal:       "المجموع الفرعي",
    checkout:       "إتمام الشراء",
    remove:         "إزالة",
    continueShopping:"مواصلة التسوق",

    // Checkout
    orderSummary:   "ملخص الطلب",
    placeOrder:     "تأكيد الطلب",
    fullName:       "الاسم الكامل",
    phone:          "رقم الهاتف",
    address:        "العنوان",
    city:           "المدينة",
    pinCode:        "الرمز البريدي",
    paymentMethod:  "طريقة الدفع",
    cashOnDelivery: "الدفع عند الاستلام",

    // Auth
    emailAddress:   "البريد الإلكتروني",
    password:       "كلمة المرور",
    confirmPassword:"تأكيد كلمة المرور",
    forgotPassword: "نسيت كلمة المرور؟",
    noAccount:      "ليس لديك حساب؟",
    hasAccount:     "لديك حساب بالفعل؟",
    registerNow:    "سجّل الآن",
    loginNow:       "ادخل الآن",
    orContinueWith: "أو تابع عبر",

    // Profile
    myAccount:      "حسابي",
    orderHistory:   "سجل الطلبات",
    accountSettings:"إعدادات الحساب",

    // Admin
    dashboard:      "لوحة التحكم",
    orderManagement:"إدارة الطلبات",
    confirmQueue:   "طابور التأكيد",
    orderHistoryAdmin:"سجل الطلبات",
    userManagement: "إدارة المستخدمين",
    productManagement:"المنتجات",
    media:          "الوسائط",

    // General
    loading:        "جاري التحميل…",
    save:           "حفظ",
    cancel:         "إلغاء",
    confirm:        "تأكيد",
    delete:         "حذف",
    edit:           "تعديل",
    back:           "رجوع",
    next:           "التالي",
    previous:       "السابق",
    search:         "بحث",
    filter:         "تصفية",
    clear:          "مسح",
    refresh:        "تحديث",
    noData:         "لا توجد بيانات",
    error:          "حدث خطأ ما",
  },
};

/* ── Language meta ──────────────────────────────────────────── */
export const LANGUAGES = [
  {
    code:   "en",
    label:  "English",
    native: "English",
    flag:   "🇬🇧",
    dir:    "ltr",
    font:   null,
  },
  {
    code:   "ar",
    label:  "Arabic",
    native: "العربية",
    flag:   "🇶🇦",
    dir:    "rtl",
    font:   "https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&display=swap",
  },
];

/* ── Context ────────────────────────────────────────────────── */
const LangContext = createContext(null);

/* ── Provider ───────────────────────────────────────────────── */
export function LangProvider({ children }) {
  const [lang, setLangState] = useState(
    () => localStorage.getItem("luxe_lang") || "en"
  );

  const currentLang = LANGUAGES.find(l => l.code === lang) || LANGUAGES[0];
  const strings     = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const isRTL       = currentLang.dir === "rtl";

  /* Apply direction + lang to <html> */
  useEffect(() => {
    const html = document.documentElement;
    html.setAttribute("dir",  currentLang.dir);
    html.setAttribute("lang", lang);

    // Font: inject Google Fonts link if needed, remove if not
    const FONT_ID = "luxe-lang-font";
    let existing  = document.getElementById(FONT_ID);

    if (currentLang.font) {
      if (!existing) {
        const link    = document.createElement("link");
        link.id       = FONT_ID;
        link.rel      = "stylesheet";
        link.href     = currentLang.font;
        document.head.appendChild(link);
      } else {
        existing.href = currentLang.font;
      }
      html.style.fontFamily = "'Cairo', 'Segoe UI', sans-serif";
    } else {
      existing?.remove();
      html.style.fontFamily = "";
    }
  }, [lang, currentLang]);

  /* Persist to localStorage */
  const setLang = useCallback((code) => {
    if (!TRANSLATIONS[code]) return;
    localStorage.setItem("luxe_lang", code);
    setLangState(code);
  }, []);

  /**
   * t(key, vars?)
   * Translate a key with optional variable interpolation.
   * e.g. t("viewAllResults", { query: "shoes" })
   *      → 'View all results for "shoes"'
   */
  const t = useCallback((key, vars = {}) => {
    let str = strings[key] ?? TRANSLATIONS.en[key] ?? key;
    Object.entries(vars).forEach(([k, v]) => {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), v);
    });
    return str;
  }, [strings]);

  return (
    <LangContext.Provider value={{ lang, setLang, t, isRTL, currentLang, LANGUAGES }}>
      {children}
    </LangContext.Provider>
  );
}

/* ── Hook ───────────────────────────────────────────────────── */
export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang() must be called inside <LangProvider>");
  return ctx;
}

export default LangContext;