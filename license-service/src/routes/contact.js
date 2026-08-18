import { Router } from "express";
import { sendContactEmail } from "../email.js";
import { contactLimitStatus, recordContactHit } from "../db.js";

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TYPES = {
  feature: "Feature Request",
  support: "Support",
};
const APPS = {
  knockapp: "KnockApp",
  visualexif: "VisualExif",
  dupsweep: "DupSweep",
  other: "Other",
};

function clientIp(req) {
  // nginx on this host sets X-Real-IP; trust-proxy/X-Forwarded-For is a fallback.
  const real = req.headers["x-real-ip"];
  if (typeof real === "string" && real.trim()) return real.trim();
  return req.ip || req.socket?.remoteAddress || "unknown";
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

router.post("/contact", async (req, res) => {
  const ip = clientIp(req);
  const limit = contactLimitStatus(ip);
  if (limit.limited) {
    const msg =
      limit.reason === "ip"
        ? "Too many messages from this network today (max 5). Try again tomorrow."
        : "The contact form is at its daily limit (max 30). Try again tomorrow.";
    return res.status(429).json({ error: msg });
  }

  const type = clip(req.body?.type, 20);
  const name = clip(req.body?.name, 80);
  const email = clip(req.body?.email, 120).toLowerCase();
  const title = clip(req.body?.title, 120);
  const description = clip(req.body?.description, 4000);
  const appId = clip(req.body?.app, 40).toLowerCase();

  if (!TYPES[type] || !name || !emailRegex.test(email) || !title || !description || !APPS[appId]) {
    return res.status(400).json({ error: "Type, name, email, title, description, and app are required." });
  }

  const source = req.headers.origin || "unknown";

  try {
    const result = await sendContactEmail({
      typeLabel: TYPES[type],
      appName: APPS[appId],
      source,
      name,
      email,
      title,
      description,
    });
    if (result?.error) {
      console.error("contact email failed:", result.error);
      return res.status(502).json({ error: "Could not send the message." });
    }
    recordContactHit(ip);
    return res.json({ ok: true });
  } catch (err) {
    console.error("contact email failed:", err);
    return res.status(502).json({ error: "Could not send the message." });
  }
});

export default router;
