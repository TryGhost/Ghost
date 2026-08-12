/**
 * Admin mount for the dev Labs panel — the React.lazy target used by src/app.tsx.
 *
 * Owns the opt-in check (`"labs": {"devLabsPanel": true}` in
 * ghost/core/config.local.json) so that app.tsx contains nothing but a
 * DEV-folded ternary. Reading it there would mean an unconditional hook call
 * surviving into production.
 *
 * Renders nothing into the React tree: the panel is appended to document.body as
 * a custom element so it sits above the whole admin (React screens, the Ember
 * shell and the editor alike) without participating in any layout.
 *
 * Applying a flag live is the other reason this wrapper exists. Writing the
 * setting is only half of what Settings → Labs does — the rest is patching the
 * caches that flag-gated code reads from, and telling Ember to refetch. Without
 * that the admin keeps rendering the old value until a reload, which is exactly
 * the friction the panel exists to remove.
 */

import {useEffect, useRef} from 'react';
import {useQueryClient} from '@tanstack/react-query';
import {configDataType, useBrowseConfig, type ConfigResponseType} from '@tryghost/admin-x-framework/api/config';
import type {LabsPanelHandle} from './panel';
import type {LabsSettings, SettingEntry} from './api';

// admin-x-framework keeps its settings dataType private, but the query key is
// [dataType, ...] and Settings → Labs reads `labs` from that cache. Leaving it
// stale lets a later save there revert a flag toggled here.
const SETTINGS_QUERY_KEY = 'SettingsResponseType';

export default function LabsPanel() {
    const client = useQueryClient();
    const {data: config} = useBrowseConfig();
    const enabled = config?.config.labs?.devLabsPanel === true;
    const labs = config?.config.labs;
    const panel = useRef<LabsPanelHandle | null>(null);

    useEffect(() => {
        if (!enabled) {
            return;
        }

        let handle: LabsPanelHandle | null = null;
        let cancelled = false;

        /**
         * Imported here rather than at module scope so a developer who hasn't
         * opted in never loads the panel — nor the labs.js text that flags.ts
         * parses, which throws by design and would otherwise put an error in the
         * console of people who have never heard of this tool. Every remaining
         * import in this module is type-only, so nothing else comes with it.
         */
        void import('./panel').then((module) => {
            if (cancelled) {
                return;
            }

            handle = module.mountLabsPanel({
                onApplied: (written: LabsSettings, settings: SettingEntry[]) => {
                    let patched = false;

                    client.setQueriesData({queryKey: [configDataType]}, (current) => {
                        const currentConfig = (current as ConfigResponseType | undefined)?.config;

                        if (!currentConfig) {
                            return current;
                        }

                        patched = true;
                        return {config: {...currentConfig, labs: written}};
                    });

                    client.setQueriesData({queryKey: [SETTINGS_QUERY_KEY]}, current => (current ? {...current, settings} : current));

                    // Throwing rather than no-oping: the caller turns this into a
                    // "saved, but the page didn't refresh" notice with a Reload
                    // button. Failing quietly would leave a developer staring at a
                    // flag that reads as applied and behaves as though it isn't.
                    if (!patched) {
                        throw new Error('Config cache was missing or had an unexpected shape');
                    }

                    // Ember owns feature state for its own screens, so patching
                    // the React caches alone would leave the two disagreeing.
                    // onUpdate — not onInvalidate — because settings are mapped as
                    // a singleton in state-bridge.js, which refuses invalidation;
                    // onUpdate pushes the response and refetches the feature flags.
                    //
                    // Known limit: that refetch is a floating promise inside Ember
                    // (state-bridge.js), so a failure there can't reach us.
                    if (!window.EmberBridge?.state) {
                        throw new Error('Ember bridge not ready, so Ember screens still hold the old value');
                    }

                    window.EmberBridge.state.onUpdate(SETTINGS_QUERY_KEY, {settings});
                }
            });

            panel.current = handle;
        }).catch((error) => {
            // Only reachable for someone who opted in, which is the point.
            // eslint-disable-next-line no-console
            console.error('Labs panel failed to load.', error);
        });

        return () => {
            cancelled = true;
            panel.current = null;
            handle?.unmount();
        };
    }, [client, enabled]);

    // Closes the loop the other way. Settings → Labs patches this same config
    // cache on every toggle (feature-toggle.tsx), so an open panel adopts the
    // change instead of sitting on the snapshot it read when it was opened.
    useEffect(() => {
        if (labs) {
            panel.current?.sync(labs);
        }
    }, [labs]);

    return null;
}
