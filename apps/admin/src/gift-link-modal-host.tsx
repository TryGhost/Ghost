import { Suspense, lazy, useEffect, useState } from "react";
import { EmberFallback, subscribeOpenGiftLinkModal } from "./ember-bridge";
import type { OpenGiftLinkModalEvent } from "./ember-bridge";

// The gift-link modal is React-owned but triggered from the Ember posts/pages
// list. It's only needed once someone opens it, so lazy-load it rather than
// pulling the posts bundle into every list view.
const GiftLinkModal = lazy(() => import("./posts/analytics/modals/gift-link-modal"));

/**
 * Bridges the Ember posts/pages context menu to the React gift-link modal.
 *
 * Subscribes to the bridge on mount and owns the modal's open/close state:
 * each request opens the modal for the named post/page (reopening the same one
 * just re-fires the event), and closing flips `open` while keeping the entry
 * so the modal can animate out.
 */
function GiftLinkModalHost() {
    const [entry, setEntry] = useState<OpenGiftLinkModalEvent | null>(null);
    const [open, setOpen] = useState(false);

    useEffect(() => subscribeOpenGiftLinkModal((event) => {
        setEntry(event);
        setOpen(true);
    }), []);

    if (!entry) {
        return null;
    }

    return (
        <Suspense fallback={null}>
            <GiftLinkModal
                key={`${entry.resource}:${entry.id}`}
                open={open}
                postId={entry.id}
                resource={entry.resource}
                source="context-menu"
                onOpenChange={setOpen}
            />
        </Suspense>
    );
}

/**
 * Route element for the Ember-backed posts and pages lists. Delegates the page
 * itself to Ember (EmberFallback) while keeping the React gift-link modal host
 * mounted so the list's context menu can open it.
 */
export function EmberListWithGiftLinks() {
    return (
        <>
            <EmberFallback />
            <GiftLinkModalHost />
        </>
    );
}
