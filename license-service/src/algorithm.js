import { randomBytes, createHash } from "node:crypto";

const SEED_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

function randomSeed(length = 20) {
  const bytes = randomBytes(length);
  let seed = "";
  for (let i = 0; i < length; i++) {
    seed += SEED_CHARS[bytes[i] % SEED_CHARS.length];
  }
  return seed;
}

// Same algorithm as SingleUseApps-KeyGen (keygen_app.py) and every app's
// offline validator: seed(20) + SHA256(seed + email + salt)[:6] as the
// signature, formatted XXXX-XXXX-XXXX-XXXX-XXXX-SIGSIG.
export function generateKey(email, salt) {
  const seed = randomSeed(20);
  const normalizedEmail = email.trim().toLowerCase();
  const hash = createHash("sha256").update(seed + normalizedEmail + salt, "utf8").digest("hex").toUpperCase();
  const signature = hash.slice(0, 6);

  const groups = [];
  for (let i = 0; i < 5; i++) {
    groups.push(seed.slice(i * 4, i * 4 + 4));
  }
  return `${groups.join("-")}-${signature}`;
}
