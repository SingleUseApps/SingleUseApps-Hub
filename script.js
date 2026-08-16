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

    // Auto-select in the buy dropdown for convenience, and keep the widget in sync
    // (only if this app is actually one of the buy options — e.g. FileLister Tauri
    // isn't, so the dropdown/widget just keep whatever was already selected).
    const appSelect = document.getElementById('appSelect');
    appSelect.value = appId;
    if (appSelect.value === appId) {
        const widget = document.getElementById('buyWidget');
        widget.setAttribute('data-app', appId);
        window.SUAWBuyWidget.init(widget);
    }
}

function hideDetails() {
    document.getElementById('details').classList.add('hidden');
}

// --- Payment & License Issuance ---
// The actual payment/checkout/key-issuance logic lives entirely in the
// shared Buy Widget (buy-widget.js, served from license-service) — the
// same embed used on every app's own site. This page only needs to keep
// the widget in sync with the app the visitor picks from the dropdown.

document.getElementById('appSelect').addEventListener('change', (e) => {
    const widget = document.getElementById('buyWidget');
    widget.setAttribute('data-app', e.target.value);
    window.SUAWBuyWidget.init(widget);
});

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
