import { generateKey } from "./algorithm.js";
import { insertLicense } from "./db.js";
import { sendLicenseEmail } from "./email.js";
import { getApp } from "./apps.js";

// Single entry point both Stripe and (later) PayPal webhooks call once a
// payment is confirmed. Idempotent on paymentRef — safe to call more than
// once for the same payment (webhook retries, etc.).
export async function issueKey({ paymentRef, provider, appId, name, email, source }) {
  const app = getApp(appId);
  if (!app) throw new Error(`Unknown app or missing salt: ${appId}`);

  const key = generateKey(email, app.salt);
  const { license, isNew } = insertLicense({ paymentRef, provider, appId, name, email, key, source });

  // Only send the email the first time this payment is processed — a
  // retried webhook must not re-notify the customer.
  if (isNew) {
    await sendLicenseEmail({ name, email, appName: app.name, key: license.key });
  }

  return license;
}
