// SingleUseApps Buy Widget — embeddable "pay for a lifetime license" form.
//
// Usage: on any allowed site (see ALLOWED_ORIGINS in license-service),
//   <div class="buy-widget" data-app="dupsweep"></div>
//   <script src="https://singleuseapps.com/buy-widget.js"></script>
//
// Optional attributes on the container:
//   data-price-label="5€"      — shown on the button (display only; the
//                                 real price is enforced server-side)
//   data-accent="#635BFF"      — accent color for the button/border
//
// One implementation, reused on every site — never duplicate this logic
// per-site. The key algorithm/salts stay server-side in license-service;
// this file only ever talks to its API.
(function () {
  const API_BASE = "https://singleuseapps.com/api";
  const STRIPE_PUBLISHABLE_KEY = "pk_test_51U4kTtRpCbAHfa5oo6iUWnaqJpYsfaX6kOiHlXrw4RffpOuo5kiL5YvdKPVSUOR0viCXUnTb3kaSi5KlFeMe5zay00y9FPsJve";
  const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  let stylesInjected = false;
  function injectStyles() {
    if (stylesInjected) return;
    stylesInjected = true;
    const style = document.createElement("style");
    style.textContent = `
      .suaw-root { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; max-width: 420px; margin: 0 auto; }
      .suaw-row { display: flex; flex-direction: column; gap: 10px; margin-bottom: 10px; }
      .suaw-root input {
        width: 100%; box-sizing: border-box; padding: 10px 12px; font-size: 14px;
        border: 1px solid #ccc; border-radius: 8px; background: #fff; color: #111;
      }
      .suaw-btn {
        width: 100%; padding: 12px 20px; font-size: 15px; font-weight: 700;
        border: none; border-radius: 8px; cursor: pointer; color: #fff;
        background: var(--suaw-accent, #635BFF);
      }
      .suaw-btn:disabled { opacity: 0.6; cursor: default; }
      .suaw-error { color: #d0342c; font-size: 13px; margin-top: 8px; }
      .suaw-pending, .suaw-result { font-family: inherit; font-size: 14px; }
      .suaw-key {
        display: inline-block; font-family: "SF Mono", Consolas, monospace; font-size: 14px;
        background: #f3f3f3; color: #111; padding: 8px 12px; border-radius: 6px; margin: 8px 0;
        letter-spacing: 1px;
      }
      .suaw-copy { margin-left: 8px; cursor: pointer; border: none; background: none; font-size: 15px; }
      .suaw-hidden { display: none !important; }
    `;
    document.head.appendChild(style);
  }

  let stripeJsPromise = null;
  function loadStripeJs() {
    if (window.Stripe) return Promise.resolve();
    if (stripeJsPromise) return stripeJsPromise;
    stripeJsPromise = new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = "https://js.stripe.com/v3/";
      script.onload = resolve;
      script.onerror = () => reject(new Error("Could not load Stripe.js"));
      document.head.appendChild(script);
    });
    return stripeJsPromise;
  }

  function renderForm(container) {
    const appId = container.getAttribute("data-app");
    const priceLabel = container.getAttribute("data-price-label") || "5€";
    const accent = container.getAttribute("data-accent");
    if (accent) container.style.setProperty("--suaw-accent", accent);

    container.innerHTML = `
      <div class="suaw-root">
        <div class="suaw-form">
          <div class="suaw-row">
            <input type="text" class="suaw-name" placeholder="Full Name">
            <input type="email" class="suaw-email" placeholder="E-mail Address">
          </div>
          <button type="button" class="suaw-btn suaw-pay">Pay with Stripe — ${priceLabel}</button>
          <p class="suaw-error suaw-hidden"></p>
        </div>
        <div class="suaw-checkout suaw-hidden"></div>
        <div class="suaw-pending suaw-hidden">⏳ Confirming your payment…</div>
        <div class="suaw-result suaw-hidden">
          ✅ Payment confirmed! Your license key (also emailed to you):
          <div><code class="suaw-key"></code><button type="button" class="suaw-copy">📋</button></div>
        </div>
      </div>
    `;

    const errorEl = container.querySelector(".suaw-error");
    const payBtn = container.querySelector(".suaw-pay");

    function showError(message) {
      errorEl.textContent = message;
      errorEl.classList.remove("suaw-hidden");
    }

    payBtn.addEventListener("click", async () => {
      const name = container.querySelector(".suaw-name").value.trim();
      const email = container.querySelector(".suaw-email").value.trim();
      errorEl.classList.add("suaw-hidden");

      if (!name || !email) return showError("Please provide your name and e-mail.");
      if (!EMAIL_REGEX.test(email)) return showError("Please enter a valid e-mail address.");

      payBtn.disabled = true;
      payBtn.textContent = "Loading checkout…";

      try {
        const res = await fetch(`${API_BASE}/checkout/stripe`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ appId, name, email, returnTo: window.location.href }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start checkout.");

        await loadStripeJs();
        container.querySelector(".suaw-form").classList.add("suaw-hidden");
        const checkoutEl = container.querySelector(".suaw-checkout");
        checkoutEl.classList.remove("suaw-hidden");

        const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);
        const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
        checkout.mount(checkoutEl);
      } catch (err) {
        showError(err.message || "Something went wrong. Please try again.");
        payBtn.disabled = false;
        payBtn.textContent = `Pay with Stripe — ${priceLabel}`;
      }
    });

    container.querySelector(".suaw-copy").addEventListener("click", () => {
      const key = container.querySelector(".suaw-key").textContent;
      navigator.clipboard.writeText(key);
    });

    return container;
  }

  function checkForReturnFromCheckout(containers) {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const appId = params.get("suaw_app");
    if (!sessionId || !appId) return;

    const container = Array.from(containers).find((c) => c.getAttribute("data-app") === appId);
    if (!container) return;

    container.querySelector(".suaw-form").classList.add("suaw-hidden");
    const pendingEl = container.querySelector(".suaw-pending");
    pendingEl.classList.remove("suaw-hidden");
    container.scrollIntoView({ behavior: "smooth", block: "center" });

    const poll = setInterval(async () => {
      try {
        const res = await fetch(`${API_BASE}/license/${sessionId}`);
        const data = await res.json();
        if (data.status === "ready") {
          clearInterval(poll);
          pendingEl.classList.add("suaw-hidden");
          container.querySelector(".suaw-key").textContent = data.key;
          container.querySelector(".suaw-result").classList.remove("suaw-hidden");
        }
      } catch {
        // Transient network hiccup — keep polling.
      }
    }, 2000);
  }

  function init() {
    injectStyles();
    const containers = document.querySelectorAll(".buy-widget[data-app]");
    containers.forEach(renderForm);
    checkForReturnFromCheckout(containers);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Public API for pages that let the visitor pick which app to buy (e.g. an
  // app-select dropdown) — update the container's data-app, then call this
  // to re-render the form fresh for the new app. Most sites embedding a
  // single, fixed app (data-app set once in the HTML) never need this.
  window.SUAWBuyWidget = {
    init: function (container) {
      injectStyles();
      renderForm(container);
    },
  };
})();
