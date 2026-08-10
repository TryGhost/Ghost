import React from 'react';
import {getSettingValues, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import type {SettingsResponseType} from '@tryghost/admin-x-framework/api/settings';
import type {ConfigResponseType} from '@tryghost/admin-x-framework/api/config';
import {toast} from 'sonner';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';

// Single definition of "Mailgun isn't connected", shared by the editor alert and the automations list
// indicator. connected = config.mailgunIsConfigured OR the three Mailgun settings being present. The
// config flag is config-only (bulkEmail.mailgun) — true on Ghost Pro, undefined in tests, false in
// dev/self-host — so `=== false` keeps the alert off on Pro and in tests. Self-hosters who connect
// Mailgun through Settings → Email write mailgun_api_key/domain/base_url without ever flipping that
// flag, so we additionally clear it when those settings are present, and gate on settings having
// loaded so a connected self-hoster doesn't see a flash before their settings arrive. (This widens the
// original config-only gate; eng owns the final signal, see the note in the PR/scratch.)
const deriveMailgunNotConnected = (
    configData: ConfigResponseType | undefined,
    settingsData: SettingsResponseType | undefined
): boolean => {
    const config = configData?.config as {mailgunIsConfigured?: boolean} | undefined;
    const [mailgunApiKey, mailgunDomain, mailgunBaseUrl] = getSettingValues(
        settingsData?.settings ?? null,
        ['mailgun_api_key', 'mailgun_domain', 'mailgun_base_url']
    );
    const dbConfigured = Boolean(mailgunApiKey && mailgunDomain && mailgunBaseUrl);
    return config?.mailgunIsConfigured === false && Boolean(settingsData) && !dbConfigured;
};

// Plain boolean read of the signal — for surfaces (e.g. the automations list) that only need to show
// or hide an indicator, with none of the editor's return choreography.
export const useMailgunNotConnected = (): boolean => {
    const {data: configData} = useBrowseConfig();
    const {data: settingsData} = useBrowseSettings();
    return deriveMailgunNotConnected(configData, settingsData);
};

// sessionStorage keys shared with the settings app. The Mailgun alert popover sets both before it
// sends the user off to Settings → Email → Mailgun; `exit-settings-button.tsx` reads RETURN_KEY to
// bring them back where they came from, and this hook reads PENDING_KEY to run the "connected"
// choreography on return. Kept as plain strings because admin-x-settings can't import from apps/admin.
export const MAILGUN_RETURN_KEY = 'ghost:settings-return-to';
export const MAILGUN_PENDING_KEY = 'ghost:mailgun-connect-pending';

const readPending = (): boolean => {
    try {
        return sessionStorage.getItem(MAILGUN_PENDING_KEY) === '1';
    } catch {
        return false;
    }
};

const clearPending = (): void => {
    try {
        sessionStorage.removeItem(MAILGUN_PENDING_KEY);
    } catch {
        // sessionStorage can throw in locked-down browsers; the choreography is a nicety, so ignore.
    }
};

// How long the "Confirming Mailgun connection…" beat reads before the alerts start to clear, and how
// long the clear animation runs. The second value is kept in step with the fade-out transitions on the
// header button and email nodes so the success toast lands exactly as they finish disappearing.
const CONFIRMING_BEAT_MS = 850;
const DISMISS_ANIMATION_MS = 320;

type Phase = 'idle' | 'verifying' | 'dismissing' | 'done';

export interface MailgunAlertState {
    // Whether the email steps + header alert should render at all.
    showAlert: boolean;
    // Whether they should be playing their fade-out animation (connected, on the way out).
    isDismissing: boolean;
    // Live "Mailgun isn't connected" truth, independent of the fade choreography — used to gate
    // publishing (which must follow the real connection state, not the animation).
    notConnected: boolean;
}

// Owns the single source of truth for the Mailgun-not-connected alert across the automation editor,
// plus the choreography that plays when the user returns from connecting. Uses the shared
// deriveMailgunNotConnected signal (see above).
export const useMailgunAlert = (): MailgunAlertState => {
    const {data: configData, isFetching: isFetchingConfig, refetch: refetchConfig} = useBrowseConfig();
    const {data: settingsData, isFetching: isFetchingSettings, refetch: refetchSettings} = useBrowseSettings();

    const notConnected = deriveMailgunNotConnected(configData, settingsData);

    // Start straight into `verifying` when we've come back from a connect attempt, so the alert never
    // flickers hidden-then-shown before the fade-out plays.
    const [phase, setPhase] = React.useState<Phase>(() => (readPending() ? 'verifying' : 'idle'));
    const toastIdRef = React.useRef<string | number | undefined>(undefined);
    const kickedOffRef = React.useRef(false);

    const isFetching = Boolean(isFetchingConfig) || Boolean(isFetchingSettings);

    // On return from a connect attempt, pull fresh config + settings. Saving Mailgun already
    // invalidates the config query, but an explicit refetch keeps this correct even if the user
    // reached the card some other way.
    React.useEffect(() => {
        if (phase !== 'verifying' || kickedOffRef.current) {
            return;
        }
        kickedOffRef.current = true;
        clearPending();
        void refetchConfig?.();
        void refetchSettings?.();
    }, [phase, refetchConfig, refetchSettings]);

    // Once fresh data is in, decide: connected → play the visible choreography; still not connected →
    // stop silently and leave the alert as it was (they came back without finishing).
    React.useEffect(() => {
        if (phase !== 'verifying' || isFetching) {
            return;
        }
        if (notConnected) {
            setPhase('idle');
            return;
        }
        // Guard against React StrictMode's double effect invocation spawning two toasts in dev.
        if (toastIdRef.current === undefined) {
            toastIdRef.current = toast.loading('Confirming Mailgun connection…');
        }
        const timer = setTimeout(() => setPhase('dismissing'), CONFIRMING_BEAT_MS);
        return () => clearTimeout(timer);
    }, [phase, isFetching, notConnected]);

    // Let the alerts fade, then celebrate — swapping the loading toast in place so it reads as one
    // continuous "confirming → connected" moment.
    React.useEffect(() => {
        if (phase !== 'dismissing') {
            return;
        }
        const timer = setTimeout(() => {
            setPhase('done');
            if (toastIdRef.current !== undefined) {
                toast.success('Mailgun is now connected', {id: toastIdRef.current});
                toastIdRef.current = undefined;
            } else {
                toast.success('Mailgun is now connected');
            }
        }, DISMISS_ANIMATION_MS);
        return () => clearTimeout(timer);
    }, [phase]);

    // Keep the alert mounted through `verifying`/`dismissing` so it has something to fade out; only
    // `done` fully removes it. `idle` falls back to the live signal (normal show/hide behaviour).
    const showAlert = phase === 'done' ? false : (phase === 'idle' ? notConnected : true);

    return {showAlert, isDismissing: phase === 'dismissing', notConnected};
};
