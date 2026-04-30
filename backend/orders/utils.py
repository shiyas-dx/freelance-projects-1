"""
orders/utils.py
WhatsApp message builders and PDF bill generator helpers.
All functions return plain strings (or dicts) — no side effects.
"""
from django.conf import settings


def _fmt_items(items) -> str:
    """Render order items as WhatsApp-friendly bullet lines."""
    lines = []
    for item in items:
        product = getattr(item, "product", None)
        name    = (product.name if product else None) or getattr(item, "product_name", f"Item #{item.pk}")
        qty     = item.quantity or 1
        price   = float(getattr(item, "price_at_purchase", None) or (product.price if product else 0))
        lines.append(f"  • {name} × {qty}  →  ₹{price * qty:.2f}")
    return "\n".join(lines) if lines else "  (no items)"


def _fmt_address(order) -> str:
    parts = [order.address, order.city]
    if order.zip:
        parts.append(f"PIN: {order.zip}")
    return ", ".join(filter(None, parts))


def get_base_url() -> str:
    return getattr(settings, "SITE_URL", "https://yourdomain.com").rstrip("/")


# ── Confirmation request message (sent BEFORE customer confirms) ──────────────

def build_confirmation_message(order, from_number: str = "") -> str:
    """
    Sent to the customer when the order is Pending.
    Contains Confirm / Cancel links the customer clicks.
    """
    base         = get_base_url()
    confirm_link = f"{base}/order/confirm/{order.confirmation_token}/confirm/"
    cancel_link  = f"{base}/order/confirm/{order.confirmation_token}/cancel/"
    items_text   = _fmt_items(order.items.all())
    address      = _fmt_address(order)

    lines = [
        f"Hello {order.name or 'Customer'} 👋",
        "",
        f"Your order *#{order.id}* is placed and awaiting your confirmation.",
        "",
        "*ORDER SUMMARY:*",
        items_text,
        "",
        f"*TOTAL: ₹{order.total_price}*",
        "",
        "*DELIVERY ADDRESS:*",
        address,
        "",
        "Please confirm or cancel your order below:",
        f"✅ *CONFIRM:* {confirm_link}",
        f"❌ *CANCEL:*  {cancel_link}",
    ]

    if from_number:
        lines += ["", f"📞 Contact us: {from_number}"]

    return "\n".join(lines)


# ── Order confirmed message (sent AFTER admin internally confirms) ────────────

def build_confirmed_message(order, from_number: str = "") -> str:
    """
    Sent after admin has confirmed the order (status = Admin Confirmed).
    No action links — just a receipt-style confirmation.
    """
    items_text = _fmt_items(order.items.all())
    address    = _fmt_address(order)

    lines = [
        f"Hello {order.name or 'Customer'} 👋",
        "",
        f"Great news! Your order *#{order.id}* has been confirmed ✅",
        "",
        "*ORDER SUMMARY:*",
        items_text,
        "",
        f"*TOTAL: ₹{order.total_price}*",
        "",
        "*DELIVERY ADDRESS:*",
        address,
        "",
        "We will notify you once your order is shipped. 🚚",
        "Thank you for shopping with us! 🛍️",
    ]

    if from_number:
        lines += ["", f"📞 Contact us: {from_number}"]

    return "\n".join(lines)


# ── Shipped bill message ──────────────────────────────────────────────────────

def build_bill_message(order, from_number: str = "") -> str:
    """
    Sent when order status = Shipped. Acts as a receipt / bill.
    """
    items_text = _fmt_items(order.items.all())
    address    = _fmt_address(order)

    from datetime import datetime
    date_str = order.created_at.strftime("%d %b %Y") if order.created_at else "—"

    lines = [
        f"🧾 *PURCHASE RECEIPT — Order #{order.id}*",
        "━━━━━━━━━━━━━━━━━━━━━━",
        "",
        f"*Customer:* {order.name}",
        f"*Date:* {date_str}",
        f"*Status:* Shipped 🚚",
        "",
        "*ITEMS:*",
        items_text,
        "",
        "━━━━━━━━━━━━━━━━━━━━━━",
        f"*TOTAL: ₹{order.total_price}*",
        "",
        "*DELIVERY TO:*",
        address,
        "",
        "Thank you for your purchase! 🙏",
    ]

    if from_number:
        lines += ["", f"📞 {from_number}"]

    return "\n".join(lines)


# ── Optional: API view helper — expose message via endpoint ──────────────────

def whatsapp_deep_link(phone: str, message: str) -> str:
    """
    Returns a wa.me deep-link.
    Frontend opens this in a new tab to launch WhatsApp Web / app.
    """
    import urllib.parse
    clean_phone = phone.replace("+", "").replace(" ", "").replace("-", "")
    if clean_phone.startswith("0"):
        clean_phone = "91" + clean_phone[1:]
    elif len(clean_phone) == 10:
        clean_phone = "91" + clean_phone
    return f"https://wa.me/{clean_phone}?text={urllib.parse.quote(message)}"