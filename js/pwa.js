/* ==========================================================================
   ROUTER Error Tracking - PWA install experience
   --------------------------------------------------------------------------
   Adds:
   - "Install app" banner using beforeinstallprompt (Chrome / Edge / Android)
   - Add-to-Home-Screen guidance on iOS Safari (no beforeinstallprompt)
   - Standalone-mode detection and a 14-day dismiss cooldown
   This file has no dependencies and fails silently when PWA APIs are absent.
   ========================================================================== */
(function (global) {
  'use strict';

  var STORAGE_KEY = 'router_pwa_install_dismissed_at';
  var COOLDOWN_MS = 14 * 24 * 60 * 60 * 1000;
  var SHOW_DELAY_MS = 2200;

  var deferredPrompt = null;
  var banner = null;
  var showTimer = null;
  var installed = false;

  function safeGet(key) {
    try { return global.localStorage.getItem(key); } catch (error) { return null; }
  }

  function safeSet(key, value) {
    try { global.localStorage.setItem(key, value); } catch (error) { /* private mode */ }
  }

  function isStandalone() {
    try {
      return (global.matchMedia && global.matchMedia('(display-mode: standalone)').matches) ||
        global.navigator.standalone === true;
    } catch (error) {
      return false;
    }
  }

  function isIos() {
    var ua = global.navigator.userAgent || '';
    var iPadOs = global.navigator.platform === 'MacIntel' && global.navigator.maxTouchPoints > 1;
    return /iPad|iPhone|iPod/i.test(ua) || iPadOs;
  }

  function isIosSafari() {
    if (!isIos()) return false;
    var ua = global.navigator.userAgent || '';
    // Chrome/Firefox/Edge on iOS cannot add to the Home Screen from their own UI.
    return !/CriOS|FxiOS|EdgiOS|OPiOS/i.test(ua);
  }

  function isDismissed() {
    var value = Number(safeGet(STORAGE_KEY) || 0);
    return value > 0 && (Date.now() - value) < COOLDOWN_MS;
  }

  function injectStyles() {
    if (document.getElementById('pwa-install-styles')) return;

    var style = document.createElement('style');
    style.id = 'pwa-install-styles';
    style.textContent = [
      '.pwa-install-banner {',
      '  position: fixed;',
      '  left: 50%;',
      '  bottom: calc(var(--bottom-nav-height, 68px) + env(safe-area-inset-bottom, 0px) + 12px);',
      '  transform: translate(-50%, 16px);',
      '  width: min(560px, calc(100vw - 24px));',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 0.75rem;',
      '  padding: 0.7rem 0.75rem 0.7rem 0.85rem;',
      '  background: var(--bg-surface, #ffffff);',
      '  color: var(--text-main, #0f172a);',
      '  border: 1px solid var(--border-subtle, #e2e8f0);',
      '  border-radius: var(--radius-lg, 16px);',
      '  box-shadow: var(--shadow-lg, 0 10px 15px -3px rgb(0 0 0 / 0.1));',
      '  z-index: 80;',
      '  opacity: 0;',
      '  visibility: hidden;',
      '  pointer-events: none;',
      '  transition: opacity 0.22s ease, transform 0.22s ease, visibility 0.22s ease;',
      '  -webkit-backdrop-filter: blur(14px);',
      '  backdrop-filter: blur(14px);',
      '}',
      '.pwa-install-banner.pwa-visible {',
      '  opacity: 1;',
      '  visibility: visible;',
      '  pointer-events: auto;',
      '  transform: translate(-50%, 0);',
      '}',
      '.pwa-install-icon {',
      '  width: 44px;',
      '  height: 44px;',
      '  border-radius: 12px;',
      '  flex: 0 0 auto;',
      '  box-shadow: 0 4px 10px rgb(37 99 235 / 0.28);',
      '}',
      '.pwa-install-copy {',
      '  flex: 1 1 auto;',
      '  min-width: 0;',
      '  line-height: 1.35;',
      '}',
      '.pwa-install-copy strong {',
      '  display: block;',
      '  font-size: 0.9rem;',
      '  font-weight: 700;',
      '  overflow-wrap: anywhere;',
      '}',
      '.pwa-install-copy p {',
      '  margin: 0.1rem 0 0;',
      '  font-size: 0.78rem;',
      '  color: var(--text-muted, #64748b);',
      '  overflow-wrap: anywhere;',
      '}',
      '.pwa-install-actions {',
      '  display: flex;',
      '  align-items: center;',
      '  gap: 0.35rem;',
      '  flex: 0 0 auto;',
      '}',
      '.pwa-install-btn {',
      '  min-height: 44px;',
      '  min-width: 44px;',
      '  padding: 0 0.9rem;',
      '  border: 0;',
      '  border-radius: var(--radius-full, 9999px);',
      '  background: linear-gradient(135deg, #2563eb, #0891b2);',
      '  color: #ffffff;',
      '  font: inherit;',
      '  font-size: 0.82rem;',
      '  font-weight: 700;',
      '  cursor: pointer;',
      '  white-space: nowrap;',
      '  touch-action: manipulation;',
      '}',
      '.pwa-install-btn:hover { filter: brightness(1.06); }',
      '.pwa-install-btn:disabled { opacity: 0.65; cursor: progress; }',
      '.pwa-install-btn:focus-visible,',
      '.pwa-install-dismiss:focus-visible {',
      '  outline: 3px solid var(--border-focus, #2563eb);',
      '  outline-offset: 2px;',
      '}',
      '.pwa-install-dismiss {',
      '  width: 44px;',
      '  height: 44px;',
      '  min-height: 44px;',
      '  display: inline-flex;',
      '  align-items: center;',
      '  justify-content: center;',
      '  border: 1px solid var(--border-subtle, #e2e8f0);',
      '  border-radius: var(--radius-full, 9999px);',
      '  background: var(--bg-subtle, #f1f5f9);',
      '  color: var(--text-muted, #64748b);',
      '  font: inherit;',
      '  font-size: 1.15rem;',
      '  line-height: 1;',
      '  cursor: pointer;',
      '  touch-action: manipulation;',
      '}',
      '.pwa-install-dismiss:hover { color: var(--text-main, #0f172a); }',
      '@media (max-width: 420px) {',
      '  .pwa-install-banner { gap: 0.55rem; padding-left: 0.7rem; }',
      '  .pwa-install-icon { width: 40px; height: 40px; border-radius: 10px; }',
      '  .pwa-install-copy strong { font-size: 0.84rem; }',
      '  .pwa-install-copy p { font-size: 0.72rem; }',
      '  .pwa-install-btn { padding: 0 0.7rem; font-size: 0.76rem; }',
      '}',
      '@media (prefers-reduced-motion: reduce) {',
      '  .pwa-install-banner { transition: none; }',
      '}',
      '@media print { .pwa-install-banner { display: none !important; } }'
    ].join('\n');

    document.head.appendChild(style);
  }

  function removeBanner() {
    if (!banner) return;
    banner.classList.remove('pwa-visible');
    var node = banner;
    banner = null;
    global.setTimeout(function () {
      if (node && node.parentNode) node.parentNode.removeChild(node);
    }, 240);
  }

  function dismissBanner() {
    safeSet(STORAGE_KEY, String(Date.now()));
    removeBanner();
  }

  function buildBanner(mode) {
    if (banner) return banner;

    injectStyles();

    var iosMode = mode === 'ios';
    banner = document.createElement('section');
    banner.className = 'pwa-install-banner';
    banner.setAttribute('role', 'region');
    banner.setAttribute('aria-label', 'ติดตั้งแอป ROUTER Error Tracking');
    banner.setAttribute('aria-live', 'polite');

    var icon = document.createElement('img');
    icon.className = 'pwa-install-icon';
    icon.src = 'icons/icon-192.png';
    icon.alt = '';
    icon.width = 44;
    icon.height = 44;
    icon.addEventListener('error', function () { icon.style.display = 'none'; });

    var copy = document.createElement('div');
    copy.className = 'pwa-install-copy';
    var title = document.createElement('strong');
    title.textContent = iosMode ? 'ติดตั้งบน iPhone / iPad' : 'ติดตั้งแอป ROUTER';
    var text = document.createElement('p');
    text.textContent = iosMode
      ? 'แตะปุ่มแชร์ แล้วเลือก “เพิ่มไปที่หน้าจอโฮม” เพื่อเปิดแบบเต็มหน้าจอ'
      : 'เปิดใช้งานเต็มหน้าจอ และเข้าถึงข้อมูลออฟไลน์ได้เร็วขึ้น';
    copy.appendChild(title);
    copy.appendChild(text);

    var actions = document.createElement('div');
    actions.className = 'pwa-install-actions';

    var primary = document.createElement('button');
    primary.type = 'button';
    primary.className = 'pwa-install-btn';
    primary.textContent = iosMode ? 'เข้าใจแล้ว' : 'ติดตั้ง';

    var close = document.createElement('button');
    close.type = 'button';
    close.className = 'pwa-install-dismiss';
    close.setAttribute('aria-label', 'ปิดคำแนะนำการติดตั้ง');
    close.innerHTML = '&times;';

    if (iosMode) {
      primary.addEventListener('click', dismissBanner);
    } else {
      primary.addEventListener('click', function () {
        if (!deferredPrompt) {
          dismissBanner();
          return;
        }
        var promptEvent = deferredPrompt;
        deferredPrompt = null;
        primary.disabled = true;
        primary.textContent = 'กำลังเปิด...';
        try {
          promptEvent.prompt();
        } catch (error) {
          primary.disabled = false;
          primary.textContent = 'ติดตั้ง';
          dismissBanner();
          return;
        }
        if (!promptEvent.userChoice || typeof promptEvent.userChoice.then !== 'function') {
          dismissBanner();
          return;
        }
        promptEvent.userChoice.then(function (choice) {
          if (choice && choice.outcome === 'accepted') {
            installed = true;
            removeBanner();
          } else {
            primary.disabled = false;
            primary.textContent = 'ติดตั้ง';
            dismissBanner();
          }
        }).catch(function () {
          primary.disabled = false;
          primary.textContent = 'ติดตั้ง';
        });
      });
    }

    close.addEventListener('click', dismissBanner);

    actions.appendChild(primary);
    actions.appendChild(close);
    banner.appendChild(icon);
    banner.appendChild(copy);
    banner.appendChild(actions);
    document.body.appendChild(banner);

    global.requestAnimationFrame(function () {
      if (banner) banner.classList.add('pwa-visible');
    });

    return banner;
  }

  function maybeShow() {
    if (installed || isStandalone() || isDismissed() || banner) return;

    if (isIosSafari()) {
      buildBanner('ios');
      return;
    }

    if (deferredPrompt) {
      buildBanner('prompt');
    }
  }

  function scheduleShow() {
    if (showTimer) global.clearTimeout(showTimer);
    showTimer = global.setTimeout(maybeShow, SHOW_DELAY_MS);
  }

  function onBeforeInstallPrompt(event) {
    event.preventDefault();
    deferredPrompt = event;
    scheduleShow();
  }

  function onAppInstalled() {
    installed = true;
    deferredPrompt = null;
    removeBanner();
    safeSet(STORAGE_KEY, '0');
    try {
      global.dispatchEvent(new CustomEvent('router:pwa-installed'));
    } catch (error) {
      /* CustomEvent is not available in very old browsers. */
    }
  }

  function init() {
    if (isStandalone()) {
      installed = true;
      return;
    }

    if (isIosSafari()) {
      scheduleShow();
    } else if (deferredPrompt) {
      scheduleShow();
    }

    // Hide the banner if the app is opened in standalone mode later.
    try {
      var media = global.matchMedia('(display-mode: standalone)');
      if (media && media.addEventListener) {
        media.addEventListener('change', function (event) {
          if (event.matches) {
            installed = true;
            removeBanner();
          }
        });
      }
    } catch (error) {
      /* matchMedia listener is optional. */
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && banner) dismissBanner();
    });
  }

  // Attach install listeners as early as possible so a fast
  // beforeinstallprompt event is never missed.
  global.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
  global.addEventListener('appinstalled', onAppInstalled);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Small public hook for debugging / future UI integration.
  global.RouterPWA = {
    isStandalone: isStandalone,
    canInstall: function () { return !!deferredPrompt; },
    promptInstall: function () {
      if (!deferredPrompt) return Promise.resolve('unavailable');
      var event = deferredPrompt;
      deferredPrompt = null;
      event.prompt();
      return event.userChoice;
    },
    dismiss: dismissBanner
  };
})(window);
