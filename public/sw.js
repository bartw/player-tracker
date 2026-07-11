// Deliberately minimal: the app is online-only (see the wayfinder map).
// This no-op service worker exists only to satisfy PWA install criteria.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
