import { Router } from "express";
import { findLicenseByPaymentRef } from "../db.js";

const router = Router();

// Polled by the frontend after Stripe redirects back, until the webhook
// has processed the payment and a key exists for this session.
router.get("/license/:sessionId", (req, res) => {
  const license = findLicenseByPaymentRef(req.params.sessionId);
  if (!license) {
    return res.json({ status: "pending" });
  }
  res.json({ status: "ready", key: license.key });
});

export default router;
