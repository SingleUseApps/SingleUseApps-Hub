# SingleUseApps — Payment, Key Generation & Multi-Site Plan

Plan for turning the manual license-key process (currently the standalone `SingleUseApps-KeyGen` desktop tool) into a real, paid, self-service flow — and restructuring the single Portal site into a multi-domain product line (Apps Hub + one site per app, starting with DupSweep).

Status: **planning/setup phase** — domains registered and migrating to Cloudflare; no backend code, no org, no landing pages built yet.

---

## 1. Goal

Port the key-generation algorithm from the private repo `luisdanielsilva/SingleUseApps-KeyGen` (a standalone PySide6 desktop tool used to manually issue keys — stays as-is, for manual/test issuance) into a real web flow: a customer pays, and a valid license key is generated and delivered automatically.

## 2. Site structure

The original single-Portal model is superseded by a multi-domain structure:

- **`luisdanielsilva.com`** — personal site (portfolio/about). No payment or key logic here.
- **Apps Hub** — `singleuseapps.com` (with `singleuseapps.pt` redirecting to it, mirroring the existing `luisdanielsilva.pt` → `.com` pattern). Shows all apps; hosts the shared checkout flow.
- **Per-app marketing sites** — one domain per app, each a lightweight landing page (screenshots, features, download, buy). First one: **DupSweep** at `dupsweep.com`.

## 3. Architecture diagram

```mermaid
flowchart TB
    Customer(["👤 Customer"])

    Personal["🧑 luisdanielsilva.com<br/>(Personal site — no payments)"]

    subgraph AppSites["📦 Per-App Marketing Sites"]
        DupSweep["dupsweep.com"]
        FutureApp["future-app.&lt;tld&gt;"]
    end

    Hub["🏬 Apps Hub — singleuseapps.com<br/>(.pt redirects here)<br/>(all apps · Buy & Generate Key)"]

    Widget["🧩 Shared Buy Widget (JS)<br/>embedded on Hub + every app site<br/>Stripe Embedded Checkout · PayPal Smart Buttons"]

    subgraph VPS["🖥️ Shared VPS (websitehost) — nginx + PM2"]
        API["License Service<br/>/api/*  (Node, PM2)<br/>CORS-enabled per app domain"]
        DB[("Issued Keys DB<br/>email · appId · key · payment_ref")]
    end

    Stripe["💳 Stripe Embedded Checkout"]
    PayPal["💳 PayPal Smart Buttons"]
    Resend["📧 Resend"]
    Inbox(["📥 singleuseapp@gmail.com<br/>(receives support@dupsweep.com,<br/>support@singleuseapps.com via<br/>Cloudflare Email Routing)"])

    Customer -->|Browses| DupSweep
    Customer -->|Browses| FutureApp
    Customer -->|Or browses directly| Hub

    DupSweep -.->|embeds| Widget
    FutureApp -.->|embeds| Widget
    Hub -.->|embeds| Widget

    Widget -->|Inline payment, stays on-domain| Stripe
    Widget -->|Inline payment, stays on-domain| PayPal

    Stripe -->|Webhook: paid| API
    PayPal -->|Webhook: paid| API

    API -->|Generate key<br/>seed + email + SALT → SHA-256| API
    API -->|Store, dedupe by payment_ref| DB
    API -->|Send key| Resend
    Resend -->|Delivers key| Customer

    Widget -->|Poll/display key| API

    Stripe -.->|Signup / dashboard alerts| Inbox
    PayPal -.->|Signup / dashboard alerts| Inbox
    Resend -.->|Signup / domain verification| Inbox
```

**Reading it:** solid arrows are the customer purchase flow (browse → pay inline → webhook confirms → key generated, stored, emailed). Dotted arrows are account-admin traffic (service signups/alerts) landing in the dedicated support inbox, kept separate from both the customer flow and any personal email.

## 4. License key algorithm

Ported from `keygen_app.py`:

```
seed      = 20 random chars from [A-Z0-9]
signature = SHA256(seed + email.lower().strip() + SALT).hex().upper()[:6]
key       = "XXXX-XXXX-XXXX-XXXX-XXXX-SIGSIG"   (seed in 5 groups of 4, then the signature)
```

- Per-app `SALT_MAP` values carry over unchanged, so keys stay compatible with however the apps currently validate them offline.
- **Bug to fix in the process:** the current Portal's client-side `script.js` reimplements this with only a **4-char** signature (`hashHex.substring(0,4)`) — must be corrected to 6 chars to match the desktop tool.
- **Security issue this whole effort fixes:** `script.js` currently exposes `SALT_MAP` and the full algorithm in public, readable client code — anyone can view-source and mint themselves free valid keys. The algorithm/salts must live server-side only, going forward.

## 5. Payments

- Both **Stripe** and **PayPal** (the Portal already has both buttons; today `simulatePayment()` is fake — a `setTimeout` with no real payment check — this gets replaced entirely).
- Real, webhook-verified confirmation before any key is issued.
- **Needed before backend build:** Stripe test + live keys, PayPal Developer sandbox + live app credentials, confirmed pricing (assumed 5€+ = lifetime license, same as current Portal copy, unless changed).

## 6. Shared "Buy Widget"

Payment is implemented **once**, embedded on every site so it feels native to each domain instead of redirecting visitors elsewhere:

- One JS+CSS widget, hosted once, included via a single `<script>` tag + per-site config (`app="dupsweep"`, price, accent color).
- Uses **Stripe Embedded Checkout/Elements** and **PayPal JS SDK Smart Buttons** — both render inline (modal/iframe), so the visitor never leaves the app's own domain (unlike a redirect to `checkout.stripe.com`).
- Every instance calls the same License Service API — one implementation, reused everywhere, only skinned per-site via config.
- Requires **CORS enabled** on the License Service for each known app domain — a config addition per new domain, not new code.
- Given repo-organization plans below, the widget will likely live as a subfolder inside `license-service` rather than its own repo, to avoid sprawl at this scale.

## 7. Backend — License Service

- Small Node/Express app, deployed to the same VPS (`websitehost`, Hetzner, Tailscale IP `100.93.94.115`, SSH alias `hetzner`) at `/var/www/license-service`.
- Run under **PM2** (mirrors the existing MetaStrip service pattern on that box), nginx-proxied at `/api/` on the Hub's server block.
- Holds `SALT_MAP` and the key algorithm server-side only.
- SQLite (or CSV, for parity with the desktop tool) table: `email, name, appId, provider, payment_ref, key, timestamp` — enforces one key per successful payment (dedupe on `payment_ref`, so retried webhooks or refreshed success pages don't double-issue).
- Stripe and PayPal each get: a create-checkout endpoint + a signature-verified webhook handler, both converging on one internal `issueKey()` function.
- Sends the key via **Resend** on successful payment, and the same key is shown on the success page once the widget polls/fetches it.

## 8. Email infrastructure

### DNS → Cloudflare
Nameservers for every relevant domain are moving from **Amen** to **Cloudflare** (free plan). Domains stay *registered* at Amen — only DNS hosting moves. Reasons: free **Cloudflare Email Routing** (below), free CDN/DDoS/WAF for static assets, better DNS management UI (needed anyway for Resend's verification records). Kept in **DNS-only / grey-cloud** mode so the existing nginx + Let's Encrypt/certbot setup on the VPS isn't disrupted.

**Status (2026-08-15): all three domains Active.**
| Domain | Status | Nameservers |
|---|---|---|
| `dupsweep.com` | ✅ Active | `diva.ns.cloudflare.com` / `eugene.ns.cloudflare.com` |
| `singleuseapps.pt` | ✅ Active | `diva.ns.cloudflare.com` / `eugene.ns.cloudflare.com` |
| `singleuseapps.com` | ✅ Active | `hans.ns.cloudflare.com` / `julissa.ns.cloudflare.com` (**different pair** — Cloudflare can assign a distinct pair per domain even in one account; don't assume the same pair applies across domains) |

**Known hiccup:** right after switching nameservers, Cloudflare may flag an "invalid DS record" — Amen's nameserver-change form doesn't actually remove the registry-level DNSSEC DS record despite implying it will. Fix: manually delete the DS record in Amen's DNSSEC section for that domain; clears within a day. Hit this for `dupsweep.com`, did not recur for `singleuseapps.com`.

### Support email — one address per app, one shared inbox
Each app domain gets its own branded address (`support@dupsweep.com`, `support@singleuseapps.com`, and so on for future apps) — better for customer trust than a generic catch-all — but all of them forward into **one** real inbox rather than a separate mailbox per app, so there's only ever one place to check:

1. **Cloudflare Email Routing** (free, unlimited domains) forwards each `support@` address into **`singleuseapp@gmail.com`** — a fresh inbox created solely for this, never the personal one.
2. **Gmail "Send mail as"** (Settings → Accounts) is configured per forwarded address so replies show `From: support@dupsweep.com` etc., not the raw Gmail address.

**Why this instead of a real multi-domain mailbox** (Proton custom domains, Migadu, Google Workspace, Zoho, Fastmail): all of those are paid, and a genuinely free native multi-domain mailbox doesn't really exist as a mainstream product — authenticated hosting for domains you don't own is exactly what those services charge for. Trade-off accepted: without dedicated per-domain DKIM signing, deliverability is a little weaker than a paid host — acceptable at current volume; revisit (e.g. Migadu, ~19€/year, unlimited domains) if that becomes a real problem.

### Implementation status (2026-08-15)

**`dupsweep.com` — fully working, receive + reply-as:**
1. Cloudflare Email Routing enabled. Hit an "Existing non-Cloudflare MX records conflict" error on first activation — a leftover MX record (likely an Amen default/parking record) had been imported into the DNS zone; fixed by deleting it under DNS → Records, then re-activating successfully.
2. Destination `singleuseapp@gmail.com` added and verified (this verification is account-wide in Cloudflare, not per-domain).
3. Routing rule `support@dupsweep.com` → `singleuseapp@gmail.com` created and confirmed working (first test email took several minutes to arrive — normal for freshly-propagated MX records).
4. **Plan correction discovered here:** Gmail's "Send mail as" does **not** offer a plain "send through Gmail" option for an arbitrary custom domain on a personal account — it always requires real SMTP relay credentials. Cloudflare Email Routing is **receive-only**, so the MX host Gmail auto-suggested (`route3.mx.cloudflare.net`) doesn't work as an outbound SMTP relay.
5. **Fix — reused Resend for outbound SMTP too**, rather than adding a new service: signed up at Resend (org `singleuseapp`), added `dupsweep.com` as a domain, added its DNS records (DKIM + a `send.dupsweep.com` MX/SPF pointing at the Amazon SES infrastructure Resend uses) in Cloudflare. Domain shows **Verified** in Resend.
6. Resend SMTP credentials (`smtp.resend.com`, port `587`, username `resend`, password = Resend API key) used in Gmail's "Send mail as" SMTP form for `support@dupsweep.com` — verified successfully.
7. Not yet added: a DMARC record for `dupsweep.com` — optional deliverability improvement, not required for the above to work.

**`singleuseapps.com` — reduced scope, in progress.** Discovered Resend's **free plan only supports 1 verified domain**, already used by `dupsweep.com`. Considered: upgrading to Resend Pro (~$20/mo, unlimited domains), a second free Resend account via Gmail plus-addressing (extra logins/API keys to juggle per app going forward), or skipping Send-as for this domain. **Decision: skip Resend/Gmail Send-as for `singleuseapps.com` for now** — zero cost, replies from this inbox just show as `singleuseapp@gmail.com` instead of `support@singleuseapps.com`, acceptable at current volume. Revisit (likely Resend Pro, since the same limit will recur for every future app domain) once it's worth it. So this domain only gets step 1–3 above (Cloudflare Email Routing, receiving only) — no domain verification or Send-as.

## 9. Domains — registered

Bought on Amen.pt (2026-08-15): `dupsweep.com`, `singleuseapps.com`, `singleuseapps.pt`.

## 10. GitHub organization — target, not yet executed

Create a `singleuseapps` GitHub Organization to separate the product line from the personal `luisdanielsilva` account. Confirmed **free** (Org Free tier = unlimited private repos, same as personal; cost only applies to Actions minutes beyond 2,000/month or advanced permissions/SSO — none relevant solo). Benefits: org-level shared secrets (VPS SSH key, Stripe/PayPal/Resend keys set once, used by every repo's Actions workflow instead of duplicated per-repo), a clean personal/business boundary, room for collaborators later. Repo transfers preserve history/issues/stars; old URLs redirect.

Suggested layout (repo names drop the `SingleUseApps-` prefix, since the org now provides that context):

```
singleuseapps/  (org)
├── hub                  ← current SingleUseApps-Portal, transferred
├── dupsweep-app         ← existing DupSweep Tauri app source, transferred
├── dupsweep-site        ← new: DupSweep marketing/landing site
├── license-service      ← new: shared backend (buy-widget folded in as a subfolder)
└── keygen-desktop       ← current SingleUseApps-KeyGen, transferred, stays as the manual/test tool
```

Considered a cross-repo GitHub Project board as a lighter alternative — rejected as a *substitute* for the org, since a Project only gives shared task visibility, it doesn't move repo ownership or share secrets. Could still be added later, on top of the org, purely for cross-repo task tracking.

## 11. DupSweep landing page

Build now, at `dupsweep.com`, in parallel with the still-pending backend — using a placeholder/fake "Buy" button (same pattern as the current Portal's `simulatePayment()`) rather than waiting on `license-service` to exist, so content/design work isn't blocked. The placeholder gets swapped for the real embedded Buy Widget once the backend is built.

**Still needed from user:** an example site to style it after, DupSweep screenshots (or these can be captured by running the app), feature copy, pricing confirmation.

## 12. Open items / next steps

- [x] Finish `singleuseapps.com` Cloudflare migration — Active
- [x] Cloudflare Email Routing + Resend SMTP + Gmail "Send mail as" fully working for `support@dupsweep.com`
- [ ] Cloudflare Email Routing (receiving only, no Resend/Send-as per the decision above) for `support@singleuseapps.com`
- [ ] Stripe test + live keys
- [ ] PayPal sandbox + live app credentials
- [ ] Confirm pricing
- [ ] Create the `singleuseapps` GitHub org, transfer/create repos per the layout above
- [ ] Scaffold `license-service` (algorithm, DB, Stripe/PayPal endpoints + webhooks, Resend integration, PM2 + nginx proxy)
- [ ] Build the shared Buy Widget
- [ ] Build the DupSweep landing page (needs example site + assets from user)
- [ ] Build/migrate the Apps Hub site to `singleuseapps.com`
- [ ] Remove the old client-side `SALT_MAP`/key-gen code and fake `simulatePayment()` from the current Portal
- [ ] Full test-mode run-through (Stripe test + PayPal sandbox) → confirm a portal-issued key validates in a real app build
- [ ] Go live: swap to live keys/webhooks
