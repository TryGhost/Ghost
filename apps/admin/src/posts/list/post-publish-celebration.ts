/**
 * The editor→list handoff for the post-publish celebration.
 *
 * The Ember editor writes a localStorage key on publish or schedule and then
 * navigates to the list; the list reads it on mount and shows the modal. The
 * editor stays Ember on both sides of the flag, so only the reader moves here.
 *
 * See `setCompleted` in `apps/ember-admin/app/components/editor/modals/publish-flow.js`.
 */

const KEYS = {
    published: 'ghost-last-published-post',
    scheduled: 'ghost-last-scheduled-post'
} as const;

export interface PublishCelebration {
    id: string;
    /** 'post' or 'page', as the editor writes it. */
    type: string;
    /** Whether it was published (vs scheduled) — decides the modal's copy. */
    wasPublished: boolean;
}

/**
 * Reads the handoff and **clears both keys as it does so**, before anything is
 * fetched.
 *
 * Ember clears after opening the modal, which means a failed request leaves the
 * key in place and the celebration re-fires on every visit to the list until it
 * happens to succeed. Clearing first costs at most one missed celebration and
 * cannot loop.
 */
export function readPublishCelebration(): PublishCelebration | null {
    const published = localStorage.getItem(KEYS.published);
    const scheduled = localStorage.getItem(KEYS.scheduled);

    localStorage.removeItem(KEYS.published);
    localStorage.removeItem(KEYS.scheduled);

    // Published first, matching the order Ember checks them in.
    const raw = published ?? scheduled;

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as {id?: unknown; type?: unknown};

        if (typeof parsed?.id !== 'string' || !parsed.id) {
            return null;
        }

        return {
            id: parsed.id,
            type: typeof parsed.type === 'string' ? parsed.type : 'post',
            wasPublished: published !== null
        };
    } catch {
        // Whatever wrote this is gone. Dropping it beats throwing on every
        // mount of the list for the rest of the session.
        return null;
    }
}
