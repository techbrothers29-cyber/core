const CACHE_NAME = 'bahofertas-v5';
const STATIC_ASSETS = [
  '/',
  '/caixa/login',
  '/favicon.png',
  '/favicon.ico',
  '/manifest.json',
  '/manifest-caixa.json'
];

// Install - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// Fetch - network-first for navigation/scripts/styles, cache-first for images
self.addEventListener('fetch', (event) => {
  const { request } = event;

  if (request.mode === 'navigate') {
    const url = new URL(request.url);
    const isCashierScope = url.pathname.startsWith('/caixa');
    const fallbackUrl = isCashierScope ? '/caixa/login' : '/';
    event.respondWith(
      fetch(request).catch(() => caches.match(fallbackUrl).then((res) => res || caches.match('/')))
    );
    return;
  }

  if (request.destination === 'style' || request.destination === 'script') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        })
        .catch(() => caches.match(request))
    );
    return;
  }

  if (request.destination === 'image') {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetched = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return response;
        });
        return cached || fetched;
      })
    );
    return;
  }

  event.respondWith(fetch(request));
});

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};

  // Heartbeat pushes — don't show notification, just keep subscription alive
  if (data.type === 'heartbeat') {
    console.log('[SW] Heartbeat received — subscription is alive');
    return;
  }

  const title = data.title || 'Bah Ofertas';
  const options = {
    body: data.body || 'Você tem uma nova notificação!',
    icon: '/pwa-icon.png',
    badge: '/pwa-icon.png',
    data: data.url || '/',
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open', title: 'Abrir' },
      { action: 'close', title: 'Fechar' }
    ]
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const url = event.notification.data || '/';

  if (event.action === 'close') return;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          client.focus();
          client.navigate(url);
          return;
        }
      }
      return self.clients.openWindow(url);
    })
  );
});

// Auto-renew expired push subscriptions (critical for Android/Chrome)
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const oldEndpoint = event.oldSubscription ? event.oldSubscription.endpoint : null;

        // Re-subscribe with the same application server key
        let newSubscription = event.newSubscription;
        if (!newSubscription) {
          const oldOptions = event.oldSubscription ? event.oldSubscription.options : {};
          newSubscription = await self.registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: oldOptions.applicationServerKey || null,
          });
        }

        if (!newSubscription) return;

        const subJson = newSubscription.toJSON();
        const endpoint = subJson.endpoint || newSubscription.endpoint;
        const p256dh = subJson.keys ? subJson.keys.p256dh : null;
        const auth = subJson.keys ? subJson.keys.auth : null;

        if (!endpoint || !p256dh || !auth) return;

        // Send renewed subscription to backend
        const response = await fetch(
          'https://xiwzpcmexnqoxnhqkbwm.supabase.co/functions/v1/register-push-subscription',
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ endpoint, p256dh, auth }),
          }
        );

        if (response.ok) {
          console.log('[SW] Push subscription renewed successfully');
        }
      } catch (err) {
        console.error('[SW] Failed to renew push subscription:', err);
      }
    })()
  );
});

// Periodic sync: re-register subscription to prevent silent expiration on Android
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'push-keepalive') {
    event.waitUntil(
      (async () => {
        try {
          const subscription = await self.registration.pushManager.getSubscription();
          if (!subscription) return;

          const subJson = subscription.toJSON();
          const endpoint = subJson.endpoint || subscription.endpoint;
          const p256dh = subJson.keys ? subJson.keys.p256dh : null;
          const auth = subJson.keys ? subJson.keys.auth : null;

          if (!endpoint || !p256dh || !auth) return;

          await fetch(
            'https://xiwzpcmexnqoxnhqkbwm.supabase.co/functions/v1/register-push-subscription',
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ endpoint, p256dh, auth }),
            }
          );
          console.log('[SW] Periodic push keepalive sent');
        } catch (err) {
          console.error('[SW] Periodic keepalive failed:', err);
        }
      })()
    );
  }
});
