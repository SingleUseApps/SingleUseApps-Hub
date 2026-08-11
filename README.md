# Single Use Apps Portal 🌐✨

This repository contains the source code for the official **Single Use Apps** portfolio landing page. It showcases our premium macOS utility suite and provides an automated distribution hub for licenses and downloads.

## 🚀 Live Site
The portal is currently hosted and accessible at your configured domain.

## 📁 Repository Structure
- `index.html`: The main landing page with glassmorphism design.
- `style.css`: Modern styling tokens and layout rules.
- `script.js`: Dynamic logic for app selection, license generation, and download mapping.

## 🛠️ Deployment Instructions
Pushing to the `main` branch automatically deploys the site via the GitHub Actions workflow in `.github/workflows/deploy.yml`, which syncs the repo to the VPS over Tailscale/SSH and restarts Nginx.

## 📥 Distribution Logic
The "Download Trial" buttons are configured to pull the latest notarized binaries directly from their respective GitHub repositories' **Releases** section to ensure users always receive the most up-to-date and secure versions.

---
*Built with ❤️ for the Single Use Apps ecosystem.*
