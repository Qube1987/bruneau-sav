import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export function usePushNotifications() {
    const [permission, setPermission] = useState<NotificationPermission>('default');
    const [isSubscribed, setIsSubscribed] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
            checkSubscription();
        }
    }, []);

    async function checkSubscription() {
        if (!('serviceWorker' in navigator)) return;
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();
            setIsSubscribed(!!subscription);
        } catch (err) {
            console.error('Erreur vérification abonnement:', err);
        }
    }

    async function subscribe() {
        if (!('serviceWorker' in navigator)) {
            alert('Service Worker non supporté sur ce navigateur');
            return;
        }

        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;

            // La clé publique VAPID doit être passée ici
            const vapidPublicKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
            if (!vapidPublicKey) {
                throw new Error('Clé publique VAPID manquante (VITE_VAPID_PUBLIC_KEY)');
            }

            consolITE_VAPID_PUBLIC_KEY?.subsont: ${ import.meta.env.VITE_VAPID_PUBLIC_KEY?.substring(0, 20) }...`)`

            const subscription = await registration.pushManager.subscribe({
                userVisibleOnly: true,
                applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
            });

            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Utilisateur non connecté');

            const sub = subscription.toJSON();

            const { error } = await supabase.from('push_subscriptions').upsert({
                user_id: user.id,
                user_email: user.email!,
                endpoint: sub.endpoint!,
                p256dh: sub.keys!.p256dh!,
                auth: sub.keys!.auth!,
                user_agent: navigator.userAgent,
                last_used: new Date().toISOString()
            }, { onConflict: 'endpoint' });

            if (error) throw error;

            setIsSubscribed(true);
            setPermission('granted');
        } catch (err: any) {
            console.error('Erreur abonnement push:', err);
            alert(`Erreur d'abonnement : ${err.message}`);
        } finally {
            setLoading(false);
        }
    }

    async function unsubscribe() {
        setLoading(true);
        try {
            const registration = await navigator.serviceWorker.ready;
            const subscription = await registration.pushManager.getSubscription();

            if (subscription) {
                await subscription.unsubscribe();

                const { error } = await supabase.from('push_subscriptions')
                    .delete()
                    .eq('endpoint', subscription.endpoint);

                if (error) console.error('Erreur suppression subscription BDD:', error);
            }

            setIsSubscribed(false);
        } catch (err) {
            console.error('Erreur désabonnement push:', err);
        } finally {
            setLoading(false);
        }
    }

    return { permission, isSubscribed, loading, subscribe, unsubscribe };
}

function urlBase64ToUint8Array(base64String: string) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
}
