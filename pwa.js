/**
 * PhilCST PWA Manager — pwa.js
 * ═══════════════════════════════════════════════════════════════
 * Handles:
 *  - Service Worker registration
 *  - Install prompt (A2HS)
 *  - Update notification banner
 *  - Online/offline status UI
 *  - Push notification permission
 * ═══════════════════════════════════════════════════════════════
 */

(function PhilCSTPWA() {
  'use strict';

  // ── Service Worker Registration ───────────────────────────────
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .then(registration => {
          console.log('[PWA] Service Worker registered. Scope:', registration.scope);

          // Listen for updates
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (!newWorker) return;

            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                // New SW installed but old one still controlling → show update banner
                showUpdateBanner(registration);
              }
            });
          });
        })
        .catch(err => {
          console.warn('[PWA] Service Worker registration failed:', err);
        });

      // Reload when new SW takes control
      let refreshing = false;
      navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (!refreshing) {
          refreshing = true;
          window.location.reload();
        }
      });
    });
  }

  // ── Install Prompt (Add to Home Screen) ───────────────────────
  let deferredInstallPrompt = null;

  window.addEventListener('beforeinstallprompt', e => {
    // Prevent the default mini-infobar (Chrome)
    e.preventDefault();
    deferredInstallPrompt = e;

    // Show our custom install button after a short delay
    setTimeout(showInstallBanner, 3500);
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] PhilCST was installed!');
    deferredInstallPrompt = null;
    hideInstallBanner();

    // Track install (replace with your analytics if needed)
    if (typeof gtag === 'function') {
      gtag('event', 'pwa_install', { event_category: 'PWA' });
    }
  });

  // ── Online / Offline Status ───────────────────────────────────
  function updateOnlineStatus() {
    const isOnline = navigator.onLine;
    document.documentElement.classList.toggle('pwa-offline', !isOnline);

    const existing = document.getElementById('pwa-offline-toast');
    if (!isOnline) {
      if (!existing) showOfflineToast();
    } else {
      if (existing) {
        existing.textContent = '✓ Back online';
        existing.style.background = 'rgba(34,197,94,0.95)';
        setTimeout(() => existing?.remove(), 2500);
      }
    }
  }

  window.addEventListener('online',  updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // ── DOM-Ready: inject PWA UI ──────────────────────────────────
  function onDOMReady(fn) {
    if (document.readyState !== 'loading') fn();
    else document.addEventListener('DOMContentLoaded', fn, { once: true });
  }

  onDOMReady(() => {
    injectStyles();
    updateOnlineStatus();
  });

  // ── UI: Offline Toast ─────────────────────────────────────────
  function showOfflineToast() {
    const toast = document.createElement('div');
    toast.id = 'pwa-offline-toast';
    toast.textContent = "◉ You're offline — showing cached content";
    document.body.appendChild(toast);
  }

  // ── UI: Install Banner ────────────────────────────────────────
  function showInstallBanner() {
    if (!deferredInstallPrompt) return;
    if (document.getElementById('pwa-install-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-install-banner';
    banner.setAttribute('role', 'banner');
    banner.setAttribute('aria-live', 'polite');

    banner.innerHTML = `
      <div class="pwa-ib-inner">
        <div class="pwa-ib-icon">
          <img src="icons/icon-72x72.png" alt="PhilCST" width="40" height="40"/>
        </div>
        <div class="pwa-ib-text">
          <strong>Install PhilCST App</strong>
          <span>Access grades, LMS & more — works offline too</span>
        </div>
        <div class="pwa-ib-actions">
          <button id="pwa-install-btn" class="pwa-btn-install" aria-label="Install app">Install</button>
          <button id="pwa-install-dismiss" class="pwa-btn-dismiss" aria-label="Dismiss install prompt">✕</button>
        </div>
      </div>
    `;

    document.body.appendChild(banner);
    // Trigger slide-in
    requestAnimationFrame(() => banner.classList.add('pwa-ib-visible'));

    document.getElementById('pwa-install-btn').addEventListener('click', triggerInstall);
    document.getElementById('pwa-install-dismiss').addEventListener('click', hideInstallBanner);
  }

  async function triggerInstall() {
    if (!deferredInstallPrompt) return;
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    console.log('[PWA] Install prompt outcome:', outcome);
    deferredInstallPrompt = null;
    hideInstallBanner();
  }

  function hideInstallBanner() {
    const banner = document.getElementById('pwa-install-banner');
    if (!banner) return;
    banner.classList.remove('pwa-ib-visible');
    setTimeout(() => banner.remove(), 400);
  }

  // ── UI: Update Banner ─────────────────────────────────────────
  function showUpdateBanner(registration) {
    if (document.getElementById('pwa-update-banner')) return;

    const banner = document.createElement('div');
    banner.id = 'pwa-update-banner';
    banner.setAttribute('role', 'status');
    banner.innerHTML = `
      <span>🆕 A new version of PhilCST is available.</span>
      <button id="pwa-update-btn">Update Now</button>
      <button id="pwa-update-dismiss">✕</button>
    `;
    document.body.appendChild(banner);
    requestAnimationFrame(() => banner.classList.add('pwa-ub-visible'));

    document.getElementById('pwa-update-btn').addEventListener('click', () => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: 'SKIP_WAITING' });
      }
      banner.remove();
    });
    document.getElementById('pwa-update-dismiss').addEventListener('click', () => {
      banner.remove();
    });
  }

  // ── Styles ────────────────────────────────────────────────────
  function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      /* ── Offline banner ── */
      #pwa-offline-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%);
        background: rgba(15, 12, 26, 0.92);
        color: #f1c06b;
        padding: 10px 22px;
        border-radius: 100px;
        font-size: 13px;
        font-weight: 500;
        z-index: 99990;
        white-space: nowrap;
        backdrop-filter: blur(12px);
        border: 1px solid rgba(241,192,107,0.25);
        box-shadow: 0 4px 24px rgba(0,0,0,0.4);
        letter-spacing: 0.3px;
        transition: background 0.4s;
      }

      /* ── Install banner ── */
      #pwa-install-banner {
        position: fixed;
        bottom: -100px;
        left: 50%;
        transform: translateX(-50%);
        width: min(480px, calc(100vw - 32px));
        background: rgba(250, 248, 243, 0.97);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        border: 1px solid rgba(59, 31, 122, 0.15);
        border-radius: 16px;
        box-shadow: 0 8px 40px rgba(0,0,0,0.15), 0 2px 8px rgba(0,0,0,0.08);
        z-index: 99989;
        transition: bottom 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
        padding: 16px;
      }

      #pwa-install-banner.pwa-ib-visible {
        bottom: 24px;
      }

      .pwa-ib-inner {
        display: flex;
        align-items: center;
        gap: 14px;
      }

      .pwa-ib-icon img {
        border-radius: 10px;
        flex-shrink: 0;
      }

      .pwa-ib-text {
        flex: 1;
        min-width: 0;
      }

      .pwa-ib-text strong {
        display: block;
        font-size: 14px;
        font-weight: 700;
        color: #0d0a1a;
        margin-bottom: 2px;
      }

      .pwa-ib-text span {
        font-size: 12px;
        color: rgba(13,10,26,0.55);
        line-height: 1.4;
        display: block;
      }

      .pwa-ib-actions {
        display: flex;
        align-items: center;
        gap: 8px;
        flex-shrink: 0;
      }

      .pwa-btn-install {
        background: #3b1f7a;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 9px 18px;
        font-size: 13px;
        font-weight: 700;
        cursor: pointer;
        transition: all 0.18s;
        white-space: nowrap;
      }

      .pwa-btn-install:hover {
        background: #5a35b8;
        transform: translateY(-1px);
        box-shadow: 0 4px 16px rgba(59,31,122,0.35);
      }

      .pwa-btn-dismiss {
        background: none;
        border: none;
        color: rgba(13,10,26,0.4);
        font-size: 16px;
        cursor: pointer;
        padding: 6px;
        border-radius: 6px;
        transition: all 0.15s;
        line-height: 1;
      }

      .pwa-btn-dismiss:hover {
        background: rgba(13,10,26,0.06);
        color: rgba(13,10,26,0.7);
      }

      /* ── Update banner ── */
      #pwa-update-banner {
        position: fixed;
        top: -60px;
        left: 50%;
        transform: translateX(-50%);
        width: min(420px, calc(100vw - 32px));
        background: #3b1f7a;
        color: #faf8f3;
        padding: 12px 16px;
        border-radius: 10px;
        box-shadow: 0 8px 32px rgba(59,31,122,0.45);
        display: flex;
        align-items: center;
        gap: 12px;
        font-size: 13px;
        z-index: 99988;
        transition: top 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      #pwa-update-banner.pwa-ub-visible {
        top: 84px; /* below fixed navbar */
      }

      #pwa-update-banner span {
        flex: 1;
        font-size: 13px;
      }

      #pwa-update-btn {
        background: rgba(255,255,255,0.18);
        border: 1px solid rgba(255,255,255,0.3);
        color: #fff;
        padding: 7px 14px;
        border-radius: 7px;
        font-size: 12px;
        font-weight: 700;
        cursor: pointer;
        white-space: nowrap;
        transition: all 0.15s;
      }

      #pwa-update-btn:hover {
        background: rgba(255,255,255,0.28);
      }

      #pwa-update-dismiss {
        background: none;
        border: none;
        color: rgba(255,255,255,0.6);
        font-size: 15px;
        cursor: pointer;
        padding: 4px;
        line-height: 1;
        transition: color 0.15s;
        flex-shrink: 0;
      }

      #pwa-update-dismiss:hover { color: #fff; }

      /* ── Offline body class ── */
      .pwa-offline .pwa-requires-network {
        opacity: 0.5;
        pointer-events: none;
        position: relative;
      }

      .pwa-offline .pwa-requires-network::after {
        content: 'Offline';
        position: absolute;
        inset: 0;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(250,248,243,0.5);
        font-size: 11px;
        color: rgba(13,10,26,0.5);
        letter-spacing: 1px;
        text-transform: uppercase;
      }
    `;
    document.head.appendChild(style);
  }

  // ── Public API ────────────────────────────────────────────────
  window.PhilCSTPWA = {
    isOnline: () => navigator.onLine,
    isInstalled: () =>
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true,
    triggerInstall,
    getCacheVersion: () => {
      if (!navigator.serviceWorker?.controller) return null;
      return new Promise(resolve => {
        const channel = new MessageChannel();
        channel.port1.onmessage = e => resolve(e.data?.version);
        navigator.serviceWorker.controller.postMessage(
          { type: 'GET_VERSION' },
          [channel.port2]
        );
      });
    }
  };

})();
