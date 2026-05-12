import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';
import {useQuery, useQueryClient} from '@tanstack/react-query';
import {LucideIcon} from '@tryghost/shade/utils';
import {useBrowseNotifications, useDeleteNotification} from '@tryghost/admin-x-framework/api/notifications';
import type {Notification} from '@tryghost/admin-x-framework/api/notifications';
import {CLIENT_ALERTS_QUERY_KEY} from '@/ember-bridge';
import type {ClientAlert} from '@/ember-bridge';

type BannerTone = 'success' | 'error' | 'neutral';

// Server notifications use `top || custom` to opt in to banner display;
// Ember-bridged alerts (every showAlert/showAPIError call) are always banners.
function isBannerNotification(notification: Notification): boolean {
    return Boolean(notification.top || notification.custom);
}

// Mirrors the type-to-color mapping in ghost/admin/app/components/gh-alert.js
// so the React shell renders the same visual treatment users see today.
function bannerToneFor(type?: string): BannerTone {
    if (type === 'success') {
        return 'success';
    }
    if (type === 'error') {
        return 'error';
    }
    return 'neutral';
}

// Sort priority by raw type, not tone, so urgent `warn` items rise above
// `info` even though they share the neutral colour palette inherited from
// the legacy gh-alert mapping.
function sortPriorityFor(type?: string): number {
    if (type === 'error') {
        return 3;
    }
    if (type === 'warn') {
        return 2;
    }
    if (type === 'success') {
        return 1;
    }
    return 0;
}

// White text on every colored bar, matching the legacy gh-alert styles
// (.gh-alert-red, -green, -black all set color: #fff). The state-*-foreground
// tokens target the 10%-opacity tinted Banner variant and fail contrast on
// full-saturation backgrounds.
const TONE_CLASSES: Record<BannerTone, string> = {
    success: 'bg-state-success text-white',
    error: 'bg-state-danger text-white',
    neutral: 'bg-foreground text-background'
};

// Unified shape for what the banner actually renders. Both sources deliver
// HTML-safe message strings: server notifications are admin-authored and
// gated behind admin auth, and Ember-bridged alerts are entity-escaped at
// the bridge unless the caller used htmlSafe().
interface BannerItem {
    id: string;
    message: string;
    type?: string;
    status?: string;
    dismissible: boolean;
    source: 'server' | 'ember';
}

function fromServerNotification(n: Notification): BannerItem {
    return {
        id: n.id,
        message: n.message,
        type: n.type,
        status: n.status,
        dismissible: n.dismissible !== false,
        source: 'server'
    };
}

function fromClientAlert(a: ClientAlert): BannerItem {
    return {
        id: a.id,
        message: a.message,
        type: a.type,
        status: a.status,
        dismissible: true,
        source: 'ember'
    };
}

interface NotificationItemProps {
    item: BannerItem;
    onDismiss: (item: BannerItem) => void;
}

function NotificationItem({item, onDismiss}: NotificationItemProps) {
    const tone = bannerToneFor(item.type);
    const urgent = tone === 'error' || item.status === 'alert' || item.type === 'warn';

    return (
        <div
            className={`flex w-full items-center justify-between gap-4 border-b border-border-subtle px-4 py-3 text-sm ${TONE_CLASSES[tone]}`}
            data-test-notification-id={item.id}
            role={urgent ? 'alert' : 'status'}
        >
            <div
                className="flex-1 [&_a]:font-medium [&_a]:underline [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{__html: item.message}}
            />

            {item.dismissible && (
                <button
                    aria-label="Dismiss notification"
                    className="-mr-1 flex size-7 shrink-0 items-center justify-center rounded-md opacity-80 hover:bg-white/15 hover:opacity-100"
                    data-test-button="close-notification"
                    type="button"
                    onClick={() => onDismiss(item)}
                >
                    <LucideIcon.X className="size-4" />
                </button>
            )}
        </div>
    );
}

function NotificationBanner() {
    const [container, setContainer] = useState<HTMLElement | null>(null);
    const queryClient = useQueryClient();
    const {data: serverData} = useBrowseNotifications({defaultErrorHandler: false});
    const {data: clientAlerts = []} = useQuery({
        queryKey: CLIENT_ALERTS_QUERY_KEY,
        queryFn: (): ClientAlert[] => [],
        staleTime: Infinity,
        cacheTime: Infinity,
        initialData: [] as ClientAlert[]
    });
    const {mutate: deleteServerNotification} = useDeleteNotification();

    useEffect(() => {
        setContainer(document.getElementById('system-banner-stack'));
    }, []);

    const serverItems = (serverData?.notifications ?? [])
        .filter(isBannerNotification)
        .map(fromServerNotification);
    const emberItems = clientAlerts.map(fromClientAlert);

    const items = [...serverItems, ...emberItems]
        .sort((a, b) => sortPriorityFor(b.type) - sortPriorityFor(a.type));

    if (!container || items.length === 0) {
        return null;
    }

    const handleDismiss = (item: BannerItem) => {
        if (item.source === 'server') {
            deleteServerNotification(item.id);
            return;
        }
        queryClient.setQueryData<ClientAlert[]>(CLIENT_ALERTS_QUERY_KEY, prev => (prev ?? []).filter(a => a.id !== item.id));
    };

    return createPortal(
        <div aria-label="Notifications" className="flex flex-col" role="region">
            {items.map(item => (
                <NotificationItem
                    key={`${item.source}:${item.id}`}
                    item={item}
                    onDismiss={handleDismiss}
                />
            ))}
        </div>,
        container
    );
}

export default NotificationBanner;
