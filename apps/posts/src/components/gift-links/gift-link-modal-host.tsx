import GiftLinkManageModal from './gift-link-manage-modal';
import React, {useEffect, useState} from 'react';

/**
 * Payload carried by the `giftLinkModalOpen` bridge signal. Mirrors the event
 * the Ember `state-bridge` service triggers from the post settings menu and the
 * posts list context menu.
 */
interface GiftLinkModalOpenEvent {
    postId: string;
    postUrl: string;
}

/**
 * Narrow view of the Ember bridge — just the gift link signal. We deliberately
 * avoid a `declare global` augmentation of `window.EmberBridge` here so this
 * package doesn't fight the admin shell's fuller declaration; the bridge is a
 * runtime contract, so a local read-through type is enough.
 */
interface GiftLinkBridge {
    on(event: 'giftLinkModalOpen', callback: (payload: GiftLinkModalOpenEvent) => void): void;
    off(event: 'giftLinkModalOpen', callback: (payload: GiftLinkModalOpenEvent) => void): void;
}

function getGiftLinkBridge(): GiftLinkBridge | undefined {
    return (window as unknown as {EmberBridge?: {state: GiftLinkBridge}}).EmberBridge?.state;
}

/**
 * Mounts the React-owned gift link manage modal alongside the Ember editor. The
 * editor lives in Ember and can't render the modal itself — instead it fires the
 * `giftLinkModalOpen` bridge signal, and this host (mounted by the admin shell
 * router on the editor route) opens the modal as an overlay for the signalled
 * post.
 *
 * The modal has no generate path: callers must ensure the post's gift link
 * exists before signalling, so the modal only ever loads and manages it.
 */
const GiftLinkModalHost: React.FC = () => {
    const [open, setOpen] = useState(false);
    // Keep the last target after close so the dialog can play its exit
    // animation and React Query keeps the post's gift link cached.
    const [target, setTarget] = useState<GiftLinkModalOpenEvent | null>(null);

    useEffect(() => {
        const handleOpen = (event: GiftLinkModalOpenEvent) => {
            setTarget({postId: event.postId, postUrl: event.postUrl});
            setOpen(true);
        };

        let detach: (() => void) | null = null;
        const tryAttach = () => {
            const bridge = getGiftLinkBridge();
            if (!bridge) {
                return false;
            }
            bridge.on('giftLinkModalOpen', handleOpen);
            detach = () => bridge.off('giftLinkModalOpen', handleOpen);
            return true;
        };

        // The bridge global is set during Ember boot; on a cold load straight to
        // /editor it may not be ready when this mounts, so poll briefly.
        let intervalId: ReturnType<typeof setInterval> | undefined;
        if (!tryAttach()) {
            intervalId = setInterval(() => {
                if (tryAttach() && intervalId) {
                    clearInterval(intervalId);
                    intervalId = undefined;
                }
            }, 100);
        }

        return () => {
            if (intervalId) {
                clearInterval(intervalId);
            }
            detach?.();
        };
    }, []);

    if (!target) {
        return null;
    }

    return (
        <GiftLinkManageModal
            open={open}
            postId={target.postId}
            postUrl={target.postUrl}
            onOpenChange={setOpen}
        />
    );
};

export default GiftLinkModalHost;
