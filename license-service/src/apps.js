// Registry of apps this service can issue licenses for.
// Salt values come from env only — never hardcode a salt here (this repo is public).
export const APPS = {
  filelister: { name: "FileLister Pro", salt: process.env.SALT_FILELISTER },
  knockapp: { name: "KnockApp", salt: process.env.SALT_KNOCKAPP },
  visualexif: { name: "VisualExif", salt: process.env.SALT_VISUALEXIF },
  filelistertauri: { name: "FileLister Tauri", salt: process.env.SALT_FILELISTERTAURI },
  dupsweep: { name: "DupSweep", salt: process.env.SALT_DUPSWEEP },
};

export function getApp(appId) {
  const app = APPS[appId];
  if (!app || !app.salt) return null;
  return app;
}
