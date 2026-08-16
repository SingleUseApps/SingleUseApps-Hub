// Portfolio Configuration
const APPS = {
    filelister: {
        name: "FileLister Pro",
        tagline: "The ultimate guardian of your storage.",
        icon: "📁",
        salt: "FileLister-Secret-Salt-2026-Porto",
        features: [
            "SHA-256 Cryptographic Hashing",
            "Final Binary Verification (Byte-by-Byte)",
            "Detailed Progress Monitoring",
            "macOS Trash Integration",
            "Safety Lock: Prevents total deletion"
        ],
        downloadUrl: "https://github.com/luisdanielsilva/FileLister/releases/latest/download/filelister.zip"
    },
    knockapp: {
        name: "KnockApp",
        tagline: "Sound triggers powered by physics.",
        icon: "🔊",
        salt: "KnockApp-Secret-Salt-2026-Standard",
        features: [
            "Accelerometer Impact Detection",
            "Custom Sound Library Support",
            "Sensitivity Calibration",
            "Low Latency Audio Engine"
        ],
        downloadUrl: "https://github.com/luisdanielsilva/KnockApp/releases/latest/download/KnockApp.zip"
    },
    visualexif: {
        name: "VisualExif",
        tagline: "Professional Metadata Surgery",
        description: "A high-performance utility for bulk metadata management. Powered by the industry-standard ExifTool, it allows for recursive folder scanning and selective neutralization of sensitive data categories.",
        features: [
            "Recursive Folder Processing",
            "Selective Tag Removal (GPS, EXIF, XMP)",
            "Native Perl Engine Included",
            "Privacy-First Architecture"
        ],
        downloadUrl: "https://github.com/luisdanielsilva/VisualExif/releases/latest/download/VisualExif.zip"
    },
    filelistertauri: {
        name: "FileLister Tauri",
        tagline: "Cross-platform duplicate finder for macOS & Windows.",
        icon: "🗂️",
        salt: "FileListerTauri-Secret-Salt-2026-Cross",
        features: [
            "SHA-256 Cryptographic Hashing",
            "Cross-Platform: macOS & Windows",
            "Final Binary Verification (Byte-by-Byte)",
            "Native Performance via Tauri & Rust",
            "macOS / Windows Trash Integration"
        ],
        // Permanent links — these always resolve to the newest release's installers.
        repo: "luisdanielsilva/FileLister-Tauri",
        downloads: [
            { label: "⌘ macOS (Apple Silicon)", url: "https://github.com/luisdanielsilva/FileLister-Tauri/releases/latest/download/FileLister-Tauri-macos.dmg" },
            { label: "⊞ Windows (.exe)", url: "https://github.com/luisdanielsilva/FileLister-Tauri/releases/latest/download/FileLister-Tauri-windows-setup.exe" }
        ]
    }
};

// --- App Selection & UI Logic ---

function selectApp(appId) {
    const app = APPS[appId];
    if (!app) return;

    document.getElementById('detailIcon').innerText = app.icon;
    document.getElementById('detailTitle').innerText = app.name;
    document.getElementById('detailTagline').innerText = app.tagline;
    
    // Update features list
    const featuresList = document.getElementById('detailFeatures');
    featuresList.innerHTML = "";
    app.features.forEach(f => {
        const li = document.createElement('li');
        li.innerText = f;
        featuresList.appendChild(li);
    });

    document.getElementById('details').classList.remove('hidden');

    // Downloads: a single button (downloadUrl) OR per-platform buttons (downloads[]).
    const downloadBtn = document.getElementById('detailDownload');
    const multiBox = document.getElementById('detailDownloads');
    multiBox.innerHTML = "";
    if (app.downloads && app.downloads.length) {
        downloadBtn.style.display = "none";
        app.downloads.forEach(d => {
            const a = document.createElement('a');
            a.href = d.url;
            a.className = "primary-btn";
            a.style.textDecoration = "none";
            a.innerText = d.label;
            multiBox.appendChild(a);
        });
    } else if (app.downloadUrl) {
        downloadBtn.href = app.downloadUrl;
        downloadBtn.style.display = "inline-block";
        downloadBtn.innerText = "Download Trial";
    } else {
        downloadBtn.style.display = "none";
    }

    // Live version label (fetched from the GitHub API) — updates itself each release.
    const versionEl = document.getElementById('detailVersion');
    versionEl.innerText = "";
    if (app.repo) {
        fetch(`https://api.github.com/repos/${app.repo}/releases/latest`)
            .then(r => r.ok ? r.json() : null)
            .then(rel => { if (rel && rel.tag_name) versionEl.innerText = "Latest version: " + rel.tag_name; })
            .catch(() => {});
    }

    // Auto-select in the generator dropdown for convenience
    document.getElementById('appSelect').value = appId;
}

function hideDetails() {
    document.getElementById('details').classList.add('hidden');
}

// --- Payment & License Issuance ---
// Key generation happens server-side (license-service) only — never in this
// file. See SingleUseApps-KeyGen / license-service for the algorithm.

const API_BASE = "https://singleuseapps.com/api";
const STRIPE_PUBLISHABLE_KEY = "pk_test_51U4kTtRpCbAHfa5oo6iUWnaqJpYsfaX6kOiHlXrw4RffpOuo5kiL5YvdKPVSUOR0viCXUnTb3kaSi5KlFeMe5zay00y9FPsJve";
const stripe = Stripe(STRIPE_PUBLISHABLE_KEY);

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function showPayError(message) {
    const el = document.getElementById('payError');
    el.innerText = message;
    el.classList.remove('hidden');
}

document.getElementById('payBtn').addEventListener('click', async () => {
    const name = document.getElementById('custName').value.trim();
    const email = document.getElementById('custEmail').value.trim();
    const appId = document.getElementById('appSelect').value;

    document.getElementById('payError').classList.add('hidden');

    if (!name || !email) {
        showPayError("Please provide your name and e-mail.");
        return;
    }
    if (!emailRegex.test(email)) {
        showPayError("Please enter a valid e-mail address.");
        return;
    }

    const btn = document.getElementById('payBtn');
    btn.disabled = true;
    btn.innerText = "Loading checkout…";

    try {
        const res = await fetch(`${API_BASE}/checkout/stripe`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ appId, name, email })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Could not start checkout.");

        document.getElementById('buyForm').classList.add('hidden');
        document.getElementById('checkoutContainer').classList.remove('hidden');

        const checkout = await stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret });
        checkout.mount('#checkoutContainer');
    } catch (err) {
        showPayError(err.message || "Something went wrong. Please try again.");
        btn.disabled = false;
        btn.innerText = "Pay with Stripe — 5€";
    }
});

// After Stripe redirects back with ?session_id=..., poll until the webhook
// has processed the payment and a key exists.
(function checkForReturnFromCheckout() {
    const sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (!sessionId) return;

    document.getElementById('buyForm').classList.add('hidden');
    document.getElementById('pendingBox').classList.remove('hidden');
    document.getElementById('support').scrollIntoView({ behavior: 'smooth', block: 'center' });

    const poll = setInterval(async () => {
        try {
            const res = await fetch(`${API_BASE}/license/${sessionId}`);
            const data = await res.json();
            if (data.status === 'ready') {
                clearInterval(poll);
                document.getElementById('pendingBox').classList.add('hidden');
                document.getElementById('finalKey').innerText = data.key;
                document.getElementById('resultBox').classList.remove('hidden');
            }
        } catch (err) {
            // Transient network hiccup — keep polling.
        }
    }, 2000);
})();

// Helper: Copy Key
function copyKey() {
    const key = document.getElementById('finalKey').innerText;
    navigator.clipboard.writeText(key).then(() => {
        const btn = document.querySelector('.copy-small');
        btn.innerText = "✓";
        setTimeout(() => btn.innerText = "📋", 2000);
    });
}

function openContact() {
    document.getElementById('contactModal').classList.remove('hidden');
}

function closeContact() {
    document.getElementById('contactModal').classList.add('hidden');
}

function sendContact() {
    const name = document.getElementById('contactName').value.trim();
    const email = document.getElementById('contactEmail').value.trim();
    const message = document.getElementById('contactMessage').value.trim();

    if (!name || !email || !message) {
        alert("Please fill all fields to send your message.");
        return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert("Please enter a valid e-mail address.");
        return;
    }

    const subject = encodeURIComponent(`Single Use Apps Contact: Message from ${name}`);
    const body = encodeURIComponent(`Name: ${name}\nContact E-mail: ${email}\n\n--- Message ---\n\n${message}`);
    
    window.location.href = `mailto:luisdanielsilva@gmail.com?subject=${subject}&body=${body}`;
    
    closeContact();
    document.getElementById('contactName').value = '';
    document.getElementById('contactEmail').value = '';
    document.getElementById('contactMessage').value = '';
}
