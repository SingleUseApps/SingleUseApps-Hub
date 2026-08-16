import { Router } from "express";
import Stripe from "stripe";
import { issueKey } from "../issueKey.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

const router = Router();

// Note: mounted with express.raw() in server.js, not express.json() — Stripe's
// signature verification needs the exact raw request body bytes.
router.post("/webhooks/stripe", async (req, res) => {
  const signature = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error("Stripe webhook signature verification failed:", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { appId, name, email } = session.metadata || {};
    try {
      await issueKey({ paymentRef: session.id, provider: "stripe", appId, name, email });
    } catch (err) {
      // Log and 500 so Stripe retries — don't silently swallow a failed issuance.
      console.error("issueKey failed for session", session.id, err);
      return res.status(500).send("issueKey failed");
    }
  }

  res.json({ received: true });
});

export default router;
