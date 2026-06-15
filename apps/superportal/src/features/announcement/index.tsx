/**
 * Announcement feature — light-DOM mount.
 *
 * Data sources, in priority order:
 *   1. Embedded — services.getState().theme.announcement is the source of
 *      truth when the host page already supplies it. Used by the standalone
 *      superportal dev server (apps/superportal/index.html hand-edits the
 *      state blob) and by any future host that wants to skip the API
 *      round-trip (e.g., admin preview iframes).
 *   2. API — fetch /members/api/announcement/ at mount. Matches today's
 *      announcement-bar exactly; the endpoint applies the member-status
 *      visibility filter server-side via
 *      AnnouncementBarSettings.getAnnouncementSettings(req.member).
 *
 * Mount order:
 *   1. Idempotency: if #announcement-bar-root already exists, exit (HMR / repeat call).
 *   2. Resolve data — embedded first, then API.
 *   3. Bail if no data.
 *   4. Inject the chunk's compiled Tailwind CSS into <head> via a <style data-superportal-announcement> tag.
 *   5. Create #announcement-bar-root, prepend to <body>, mount React. The id
 *      is a public theme contract — themes attach a ResizeObserver to it to
 *      set --announcement-bar--height on body.
 */

import {createRoot} from 'react-dom/client';
import {ErrorBoundary} from '../../shared/components/ErrorBoundary';
import {AnnouncementBar} from './AnnouncementBar';
import announcementCss from './announcement.tailwind.css?inline';
import {fetchAnnouncement, type AnnouncementPayload} from './api';
import type {FeatureMount, PortalState} from '../../types';

const ROOT_ID = 'announcement-bar-root';
const STYLE_MARKER = 'data-superportal-announcement';

function injectStyleOnce(): void {
    if (document.querySelector(`style[${STYLE_MARKER}]`)) {
        return;
    }
    const styleEl = document.createElement('style');
    styleEl.setAttribute(STYLE_MARKER, '');
    styleEl.textContent = announcementCss;
    document.head.appendChild(styleEl);
}

function readEmbeddedAnnouncement(state: PortalState): AnnouncementPayload | null {
    const announcement = state.theme.announcement;
    if (typeof announcement !== 'string' || !announcement.trim()) {
        return null;
    }
    const bg = state.theme.announcement_background;
    return {
        announcement,
        announcement_background: typeof bg === 'string' && bg.trim() ? bg : 'dark'
    };
}

export const mount: FeatureMount = async ({services}): Promise<void> => {
    if (document.getElementById(ROOT_ID)) {
        return;
    }

    const state = services.getState();
    const data = readEmbeddedAnnouncement(state) ?? await fetchAnnouncement(state.site.url);
    if (!data) {
        // Nothing to render — no embedded content, viewer filtered out, or fetch failed.
        return;
    }

    // Re-check idempotency in case of concurrent mounts during the await.
    if (document.getElementById(ROOT_ID)) {
        return;
    }

    injectStyleOnce();

    const container = document.createElement('div');
    container.id = ROOT_ID;
    container.setAttribute('dir', services.dir());
    document.body.prepend(container);

    const root = createRoot(container);
    root.render(
        <ErrorBoundary>
            <AnnouncementBar data={data} services={services} />
        </ErrorBoundary>
    );
};
