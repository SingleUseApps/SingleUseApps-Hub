import { Router } from "express";
import Stripe from "stripe";
import { getApp } from "../apps.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const MIN_PRICE_CENTS = parseInt(process.env.MIN_PRICE_CENTS || "500", 10);

const router = Router();

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/checkout/stripe", async (req, res) => {
  const { appId, name, email } = req.body || {};

  if (!name?.trim() || !email?.trim() || !emailRegex.test(email.trim())) {
    return res.status(400).json({ error: "Valid name and email are required." });
  }
  const app = getApp(appId);
  if (!app) {
    return res.status(400).json({ error: "Unknown app." });
  }

  // Return to whichever allowed page actually called this — req.headers.origin
  // is already validated by the cors() middleware, so it's trusted here.
  const origin = req.headers.origin || "https://singleuseapps.com";

  // Fixed price for now. "Pay what you want" (custom_unit_amount) requires a
  // pre-created Stripe Price object referenced by ID — Checkout Sessions don't
  // accept it inline via price_data. Follow-up, not needed to prove the flow.
  const session = await stripe.checkout.sessions.create({
    ui_mode: "embedded",
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "eur",
          product_data: { name: `${app.name} — Lifetime License` },
          unit_amount: MIN_PRICE_CENTS,
        },
        quantity: 1,
      },
    ],
    metadata: { appId, name: name.trim(), email: email.trim().toLowerCase() },
    return_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
  });

  res.json({ clientSecret: session.client_secret });
});

export default router;
