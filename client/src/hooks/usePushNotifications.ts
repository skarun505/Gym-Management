/**
 * usePushNotifications — Web Push subscription manager
 * Usage: const { isSupported, isSubscribed, isLoading, subscribe, unsubscribe } = usePushNotifications()
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import useAuthStore from '../store/authStore';

// Your VAPID public key — generate at: https://vapidkeys.com  or run:
// node -e "const webpush=require('web-push'); const k=webpush.generateVAPIDKeys(); console.log(k);"
// Then set VAPID_PUBLIC_KEY in your .env and VAPID_PRIVATE_KEY + VAPID_PUBLIC_KEY in Supabase secrets
const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY || '';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map(c => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const { user } = useAuthStore();
  const [isSupported,  setIsSupported]  = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading,    setIsLoading]    = useState(false);

  useEffect(() => {
    const supported = 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    if (supported) checkExistingSubscription();
  }, []);

  const checkExistingSubscription = async () => {
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      setIsSubscribed(!!sub);
    } catch { /* ignore */ }
  };

  const subscribe = async (): Promise<boolean> => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;

      // Get or create subscription
      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
        });
      }

      const json    = sub.toJSON();
      const keys    = json.keys as { p256dh: string; auth: string };

      // Save to Supabase
      const { error } = await supabase.from('push_subscriptions').upsert({
        profile_id: user?.id,
        gym_id:     user?.gym_id || null,
        endpoint:   json.endpoint,
        p256dh:     keys.p256dh,
        auth_key:   keys.auth,
        user_agent: navigator.userAgent.slice(0, 200),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'endpoint' });

      if (error) throw error;
      setIsSubscribed(true);
      return true;
    } catch (e) {
      console.error('Push subscribe error:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async (): Promise<boolean> => {
    setIsLoading(true);
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', sub.endpoint);
        await sub.unsubscribe();
      }
      setIsSubscribed(false);
      return true;
    } catch (e) {
      console.error('Push unsubscribe error:', e);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { isSupported, isSubscribed, isLoading, subscribe, unsubscribe };
}
