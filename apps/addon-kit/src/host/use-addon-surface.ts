import {useEffect, useMemo, useRef, useState} from 'react';
import {RemoteReceiver} from '@remote-dom/core/receivers';
import {release, retain} from '@quilted/threads';
import {useBrowseSite} from '@tryghost/admin-x-framework/api/site';
import {AddonSandboxController} from './sandbox-controller.ts';
import {useHostCapabilities} from './capabilities.ts';
import {
    ADDON_API_VERSION,
    SHOULD_RENDER_PAIRS,
    type AddonDataEnvelope,
    type AddonInstallRecord,
    type AddonRenderTarget
} from '../types.ts';

export type AddonSurfaceStatus = 'loading' | 'ready' | 'hidden' | 'error';

export interface UseAddonSurfaceOptions {
    install: AddonInstallRecord;
    target: AddonRenderTarget;
    /** Target-specific context (range for cards, path for pages). */
    context: Record<string, unknown>;
}

export interface UseAddonSurfaceResult {
    receiver: RemoteReceiver;
    status: AddonSurfaceStatus;
    error: Error | null;
}

/**
 * Boots one sandbox for one (install, target) pair and drives it through the
 * full lifecycle: load bundle(s) → should-render check → render → live data
 * updates. Returns the RemoteReceiver to mount in a RemoteRootRenderer.
 */
export function useAddonSurface({install, target, context}: UseAddonSurfaceOptions): UseAddonSurfaceResult {
    const [receiver] = useState(() => new RemoteReceiver({retain, release}));
    const [status, setStatus] = useState<AddonSurfaceStatus>('loading');
    const [error, setError] = useState<Error | null>(null);
    const capabilities = useHostCapabilities(install);
    const {data: siteData} = useBrowseSite();

    const site = siteData?.site;
    const contextKey = JSON.stringify(context);
    const envelope = useMemo<AddonDataEnvelope>(() => ({
        site: {
            url: site?.url ?? window.location.origin,
            title: site?.title ?? ''
        },
        apiVersion: ADDON_API_VERSION,
        context: JSON.parse(contextKey)
    }), [site?.url, site?.title, contextKey]);

    const controllerRef = useRef<AddonSandboxController | null>(null);
    const readyRef = useRef(false);
    const envelopeRef = useRef(envelope);
    envelopeRef.current = envelope;
    const capabilitiesRef = useRef(capabilities);
    capabilitiesRef.current = capabilities;

    const renderEntry = install.targeting.find(entry => entry.target === target);
    const shouldRenderEntry = install.targeting.find(entry => entry.target === SHOULD_RENDER_PAIRS[target]);
    const renderBundleUrl = renderEntry?.bundleUrl;

    useEffect(() => {
        if (!renderBundleUrl) {
            setStatus('error');
            setError(new Error(`Add-on "${install.handle}" has no bundle for target ${target}`));
            return;
        }

        let cancelled = false;
        const controller = new AddonSandboxController();
        controllerRef.current = controller;
        readyRef.current = false;
        setStatus('loading');
        setError(null);

        const boot = async () => {
            await controller.start();
            await controller.loadBundle({url: renderBundleUrl, integrity: renderEntry?.integrity});

            if (shouldRenderEntry) {
                await controller.loadBundle({url: shouldRenderEntry.bundleUrl, integrity: shouldRenderEntry.integrity});
                const visible = await controller.shouldRender({
                    bundleUrl: shouldRenderEntry.bundleUrl,
                    data: envelopeRef.current,
                    capabilities: capabilitiesRef.current
                });
                if (cancelled) {
                    return;
                }
                if (!visible) {
                    setStatus('hidden');
                    return;
                }
            }

            await controller.render({
                bundleUrl: renderBundleUrl,
                connection: receiver.connection,
                data: envelopeRef.current,
                capabilities: capabilitiesRef.current
            });
            if (!cancelled) {
                readyRef.current = true;
                setStatus('ready');
            }
        };

        boot().catch((bootError: Error) => {
            if (!cancelled) {
                setStatus('error');
                setError(bootError);
            }
        });

        return () => {
            cancelled = true;
            readyRef.current = false;
            controllerRef.current = null;
            controller.destroy();
        };
        // Reboot only when the surface identity changes, not on data changes.
    }, [install.handle, install.version, target, renderBundleUrl, receiver]);

    useEffect(() => {
        if (readyRef.current && controllerRef.current) {
            controllerRef.current.updateData(envelope).catch(() => {
                // Sandbox went away mid-update; the boot effect handles state.
            });
        }
    }, [envelope, status]);

    return {receiver, status, error};
}
