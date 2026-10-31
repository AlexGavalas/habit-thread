import { booleanResponseSchema } from '~schemas/response';
import { parseResponse } from '~util/parse-response';

const urlBase64ToUint8Array = (value: string): Uint8Array<ArrayBuffer> => {
    const padding = '='.repeat((4 - (value.length % 4)) % 4);
    const base64 = `${value}${padding}`.replace(/-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const output = new Uint8Array(new ArrayBuffer(rawData.length));

    for (let index = 0; index < rawData.length; index += 1) {
        output[index] = rawData.charCodeAt(index);
    }

    return output;
};

const getSubscription = async (): Promise<PushSubscription> => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey) {
        throw new Error('Push notifications are not configured');
    }

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') {
        throw new Error('Notification permission was not granted');
    }

    const registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
        updateViaCache: 'none',
    });
    const existing = await registration.pushManager.getSubscription();

    return (
        existing ??
        registration.pushManager.subscribe({
            applicationServerKey: urlBase64ToUint8Array(publicKey),
            userVisibleOnly: true,
        })
    );
};

export const subscribeCurrentDevice = async (): Promise<void> => {
    const subscription = await getSubscription();
    const response = await fetch('/api/v1/push-subscription', {
        body: JSON.stringify(subscription.toJSON()),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
    });
    if (!response.ok) {
        throw new Error('Could not save push subscription');
    }
};

export const getCurrentSubscription =
    async (): Promise<PushSubscription | null> => {
        const registration = await navigator.serviceWorker.getRegistration('/');
        return registration?.pushManager.getSubscription() ?? null;
    };

export const isSubscriptionSaved = async (
    subscription: PushSubscription,
): Promise<boolean> => {
    const query = new URLSearchParams({ endpoint: subscription.endpoint });
    const response = await fetch(`/api/v1/push-subscription?${query}`);
    if (!response.ok) {
        return false;
    }

    const { data: isSaved } = await parseResponse(
        response,
        booleanResponseSchema,
    );
    return isSaved;
};

export const unsubscribeCurrentDevice = async (): Promise<void> => {
    const subscription = await getCurrentSubscription();
    if (!subscription) {
        return;
    }

    const response = await fetch('/api/v1/push-subscription', {
        body: JSON.stringify({ endpoint: subscription.endpoint }),
        headers: { 'Content-Type': 'application/json' },
        method: 'DELETE',
    });
    if (!response.ok) {
        throw new Error('Could not delete push subscription');
    }

    await subscription.unsubscribe();
};
