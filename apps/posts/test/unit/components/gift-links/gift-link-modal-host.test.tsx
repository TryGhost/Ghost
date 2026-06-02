import GiftLinkModalHost from '@src/components/gift-links/gift-link-modal-host';
import {act, render, screen} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';

// Stub the modal so the host test stays focused on bridge wiring rather than
// the modal's data fetching (covered separately / end-to-end).
vi.mock('@src/components/gift-links/gift-link-manage-modal', () => ({
    default: ({open: isOpen, postId, postUrl, onOpenChange}: {open: boolean; postId: string; postUrl: string; onOpenChange: (next: boolean) => void}) => (
        isOpen
            ? (
                <div data-post-id={postId} data-post-url={postUrl} data-testid="modal">
                    <button type="button" onClick={() => onOpenChange(false)}>close</button>
                </div>
            )
            : null
    )
}));

type Handler = (event: {postId: string; postUrl: string}) => void;

function installMockBridge() {
    const handlers = new Set<Handler>();
    const on = vi.fn((_event: string, cb: Handler) => handlers.add(cb));
    const off = vi.fn((_event: string, cb: Handler) => handlers.delete(cb));
    const emit = (payload: {postId: string; postUrl: string}) => handlers.forEach(cb => cb(payload));
    (window as unknown as {EmberBridge?: unknown}).EmberBridge = {state: {on, off}};
    return {on, off, emit};
}

describe('GiftLinkModalHost', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
        delete (window as unknown as {EmberBridge?: unknown}).EmberBridge;
    });

    it('renders nothing until a gift link signal arrives', () => {
        installMockBridge();
        render(<GiftLinkModalHost />);
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('subscribes to the bridge and opens the modal for the signalled post', () => {
        const bridge = installMockBridge();
        render(<GiftLinkModalHost />);

        expect(bridge.on).toHaveBeenCalledWith('giftLinkModalOpen', expect.any(Function));

        act(() => {
            bridge.emit({postId: 'abc123', postUrl: 'https://example.com/my-post/'});
        });

        const modal = screen.getByTestId('modal');
        expect(modal).toHaveAttribute('data-post-id', 'abc123');
        expect(modal).toHaveAttribute('data-post-url', 'https://example.com/my-post/');
    });

    it('closes the modal when the dialog requests it', () => {
        const bridge = installMockBridge();
        render(<GiftLinkModalHost />);

        act(() => {
            bridge.emit({postId: 'abc123', postUrl: 'https://example.com/my-post/'});
        });
        expect(screen.getByTestId('modal')).toBeInTheDocument();

        act(() => {
            screen.getByText('close').click();
        });
        expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
    });

    it('attaches once the bridge becomes available after mount', () => {
        // No bridge at mount time — host should poll and attach later.
        render(<GiftLinkModalHost />);
        const bridge = installMockBridge();

        act(() => {
            vi.advanceTimersByTime(100);
        });

        expect(bridge.on).toHaveBeenCalledWith('giftLinkModalOpen', expect.any(Function));

        act(() => {
            bridge.emit({postId: 'late', postUrl: 'https://example.com/late/'});
        });
        expect(screen.getByTestId('modal')).toHaveAttribute('data-post-id', 'late');
    });

    it('unsubscribes on unmount', () => {
        const bridge = installMockBridge();
        const {unmount} = render(<GiftLinkModalHost />);

        unmount();
        expect(bridge.off).toHaveBeenCalledWith('giftLinkModalOpen', expect.any(Function));
    });
});
