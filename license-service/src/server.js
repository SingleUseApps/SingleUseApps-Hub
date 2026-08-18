import "dotenv/config";
import express from "express";
import cors from "cors";
import checkoutRouter from "./routes/checkout.js";
import webhookRouter from "./routes/webhook.js";
import licenseRouter from "./routes/license.js";
import contactRouter from "./routes/contact.js";

const app = express();
const PORT = process.env.PORT || 4002;
const allowedOrigins = (process.env.ALLOWED_ORIGINS || "").split(",").map((s) => s.trim()).filter(Boolean);

// nginx sits in front and sets X-Forwarded-For — needed for per-IP rate limits.
app.set("trust proxy", 1);

app.use(cors({ origin: allowedOrigins }));

// Stripe's signature check needs the exact raw request body bytes, so this
// path gets a raw parser instead of JSON — scoped to just this path so it
// doesn't affect any other route. Must be registered before express.json().
app.use("/api/webhooks/stripe", express.raw({ type: "application/json" }));
app.use("/api", webhookRouter);

app.use(express.json());
app.use("/api", checkoutRouter);
app.use("/api", licenseRouter);
app.use("/api", contactRouter);

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`license-service listening on :${PORT}`);
});
