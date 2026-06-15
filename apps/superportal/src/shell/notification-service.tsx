import {createElement, useEffect, useState, type ReactNode} from 'react';
import {createRoot, type Root} from 'react-dom/client';
import {ErrorBoundary} from '../shared/components/ErrorBoundary';
import {Notification} from '../shared/components/notification/Notification';
import {NotificationIframe} from '../shared/components/notification/NotificationIframe';
import sharedTailwindCss from '../shared/styles/tailwind.css?inline';
import sharedAnimationsCss from '../shared/styles/animations.css?inline';
import type {
    NotificationHandle,
    NotificationOptions,
    PortalState,
    Translator
} from '../types';

// Shell-level toast service. Sibling of ModalService, non-modal posture.
interface NotificationServiceDeps {
    getState(): PortalState;
    t: Translator;
    /** Active-locale text direction, applied to the toast iframe + anchor side. */
    getDir?(): 'ltr' | 'rtl';
}

export class NotificationService {
    private host: HTMLElement | null = null;
    private root: Root | null = null;
    private deps: NotificationServiceDeps;
    private currentClose: (() => void) | null = null;

    constructor(deps: NotificationServiceDeps) {
        this.deps = deps;
    }

    show(options: NotificationOptions): NotificationHandle {
        this.currentClose?.();

        const close = (): void => {
            if (this.currentClose !== close) return;
            this.currentClose = null;
            this.render(null);
        };
        this.currentClose = close;

        this.render(options);
        return {close};
    }

    private render(options: NotificationOptions | null): void {
        if (!this.host) {
            this.host = document.createElement('div');
            this.host.setAttribute('data-superportal-notification-host', '');
            document.body.appendChild(this.host);
            this.root = createRoot(this.host);
        }
        if (!this.root) return;

        if (options === null) {
            this.root.render(null);
            return;
        }

        const state = this.deps.getState();
        const accentColor = state.site.accent_color || '#15171a';
        const dir = this.deps.getDir?.() ?? 'ltr';

        this.root.render(
            createElement(
                ErrorBoundary,
                {onError: () => this.currentClose?.()},
                createElement(NotificationShell, {
                    options,
                    accentColor,
                    dir,
                    t: this.deps.t,
                    onRequestClose: () => this.currentClose?.()
                })
            )
        );
    }
}

interface NotificationShellProps {
    options: NotificationOptions;
    accentColor: string;
    dir: 'ltr' | 'rtl';
    t: Translator;
    onRequestClose(): void;
}

function NotificationShell({options, accentColor, dir, t, onRequestClose}: NotificationShellProps): ReactNode {
    const [leaving, setLeaving] = useState(false);

    const [styles] = useState<string[]>(() => {
        const hostVars = `:root { --ghost-accent-color: ${accentColor}; }`;
        return [BASE_NOTIFICATION_CSS, hostVars, sharedTailwindCss, sharedAnimationsCss];
    });

    // Errors stay until dismissed; success auto-hides.
    useEffect(() => {
        const autoHide = options.autoHide ?? options.status === 'success';
        if (!autoHide) return undefined;
        const duration = options.duration ?? 3000;
        const timer = window.setTimeout(() => setLeaving(true), duration);
        return () => window.clearTimeout(timer);
    }, [options]);

    return (
        <NotificationIframe styles={styles} title="Ghost notification" dir={dir}>
            <Notification
                type={options.type}
                status={options.status}
                message={options.message}
                giftErrorCode={options.giftErrorCode}
                firstname={options.firstname}
                siteTitle={options.siteTitle}
                siteUrl={options.siteUrl}
                hasMember={options.hasMember}
                leaving={leaving}
                t={t}
                onClose={() => setLeaving(true)}
                onAnimationEnd={(animationName) => {
                    if (animationName === 'gh-notification-slideout') {
                        onRequestClose();
                    }
                }}
            />
        </NotificationIframe>
    );
}

const BASE_NOTIFICATION_CSS = `
:root, html, body { box-sizing: border-box; }
html, body { height: 100%; margin: 0; padding: 0; background: transparent; overflow: hidden; pointer-events: none; }
*, *::before, *::after { box-sizing: inherit; }
body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; color: #15171a; font-size: 14px; line-height: 1.5; }
`;
