import React, { useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

const FALLBACK_VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

function uint8ArrayToBase64Url(bytes: Uint8Array) {
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
  return window
    .btoa(binary)
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function usePushSubscription() {
  const { user } = useAuth();

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

    const subscribe = async (requestPermissionOnDemand: boolean) => {
      try {
        if (!('Notification' in window)) return;

        let permission = Notification.permission;

        if (permission === 'default' && requestPermissionOnDemand) {
          permission = await Notification.requestPermission();
        }

        if (permission !== 'granted') {
          console.log(`Push subscription not available: permission is ${permission}`);
          return;
        }

        if (!('PushManager' in window)) {
          console.log('Push subscription not available: PushManager unsupported on this device/context');
          return;
        }

        const { data: keyData, error: keyError } = await supabase.functions.invoke('register-push-subscription', {
          body: { action: 'get_public_key' },
        });

        const vapidPublicKey = keyData?.publicKey || FALLBACK_VAPID_PUBLIC_KEY;

        if (keyError || !vapidPublicKey) {
          console.log('Push subscription not available: missing VAPID public key');
          return;
        }

        const registration = await navigator.serviceWorker.ready;

        let subscription = await registration.pushManager.getSubscription();

        // Always try to get a fresh subscription to prevent expiration
        // Android/Chrome can silently expire subscriptions
        if (subscription) {
          try {
            if (!subscription.endpoint) {
              await subscription.unsubscribe();
              subscription = null;
            }
          } catch {
            await subscription.unsubscribe().catch(() => {});
            subscription = null;
          }
        }

        if (!subscription) {
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
          });
        }

        // Always re-register with backend to keep subscription alive (upsert)

        const subJson = subscription.toJSON();
        const endpoint = subJson.endpoint || subscription.endpoint;
        const p256dh =
          subJson.keys?.p256dh ||
          (() => {
            const key = subscription.getKey('p256dh');
            return key ? uint8ArrayToBase64Url(new Uint8Array(key)) : undefined;
          })();
        const auth =
          subJson.keys?.auth ||
          (() => {
            const key = subscription.getKey('auth');
            return key ? uint8ArrayToBase64Url(new Uint8Array(key)) : undefined;
          })();

        if (!endpoint || !p256dh || !auth) {
          console.log('Push subscription not available: missing endpoint/keys in subscription payload');
          return;
        }

        const { error } = await supabase.functions.invoke('register-push-subscription', {
          body: {
            endpoint,
            p256dh,
            auth,
            user_id: user?.id || null,
          },
        });

        if (error) throw error;
      } catch (err) {
        console.log('Push subscription not available:', err);
      }
    };

    const timer = setTimeout(async () => {
      await subscribe(false);
      // Register periodic sync to keep subscription alive on Android
      try {
        const registration = await navigator.serviceWorker.ready;
        if ('periodicSync' in registration) {
          await (registration as any).periodicSync.register('push-keepalive', {
            minInterval: 12 * 60 * 60 * 1000, // 12 hours
          });
        }
      } catch {
        // periodicSync not supported or permission denied — fallback is the re-register on each visit
      }
    }, 3000);

    const handleFirstInteraction = () => {
      subscribe(true);
    };

    if (typeof Notification !== 'undefined' && Notification.permission !== 'granted') {
      // iOS exige gesto real do usuário; click/touchend é mais confiável que pointerdown
      window.addEventListener('click', handleFirstInteraction, { once: true });
      window.addEventListener('touchend', handleFirstInteraction, { once: true });
      window.addEventListener('pointerdown', handleFirstInteraction, { once: true });
      window.addEventListener('keydown', handleFirstInteraction, { once: true });

      if (isIOS && !isStandalone) {
        console.log('Push subscription not available on iOS browser tab: open from Home Screen (standalone).');
      }
    }

    return () => {
      clearTimeout(timer);
      window.removeEventListener('click', handleFirstInteraction);
      window.removeEventListener('touchend', handleFirstInteraction);
      window.removeEventListener('pointerdown', handleFirstInteraction);
      window.removeEventListener('keydown', handleFirstInteraction);
    };
  }, [user?.id]);
}
