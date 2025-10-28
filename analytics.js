(() => {
  const ANALYTICS_ENDPOINT = '/api/analytics';
  const DEVICE_ID_KEY = 'analytics_device_id_v1';
  const SESSION_ID = generateId();

  function generateId() {
    // RFC4122-ish v4
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = (Math.random() * 16) | 0;
      const v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getDeviceId() {
    try {
      const existing = localStorage.getItem(DEVICE_ID_KEY);
      if (existing) return existing;
      const id = generateId();
      localStorage.setItem(DEVICE_ID_KEY, id);
      return id;
    } catch {
      return generateId();
    }
  }

  function nowTs() {
    try {
      return Date.now();
    } catch {
      return new Date().getTime();
    }
  }

  function basePayload() {
    return {
      url: location.href,
      title: document.title,
      referrer: document.referrer || undefined,
      deviceId: getDeviceId(),
      sessionId: SESSION_ID,
      ts: nowTs()
    };
  }

  function send(eventName, properties) {
    const payload = { eventName, properties: properties || {}, ...basePayload() };

    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
        const ok = navigator.sendBeacon(ANALYTICS_ENDPOINT, blob);
        if (ok) return;
      }
    } catch {}

    try {
      fetch(ANALYTICS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        keepalive: true
      }).catch(() => {});
    } catch {}
  }

  const analytics = {
    page(extra) {
      send('page_view', extra || {});
    },
    track(name, props) {
      if (!name || typeof name !== 'string') return;
      send(name, props || {});
    }
  };

  // Expose globally
  try { window.analytics = analytics; } catch {}

  // Auto page view
  function autoPage() {
    try { analytics.page(); } catch {}
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    autoPage();
  } else {
    document.addEventListener('DOMContentLoaded', autoPage);
  }
})();
