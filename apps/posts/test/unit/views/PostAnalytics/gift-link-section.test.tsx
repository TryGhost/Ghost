import GiftLinkSection from '@src/views/PostAnalytics/components/gift-link-section';
import trackEvent from '@src/utils/analytics';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {useEnsureGiftLink, useGiftLinkForPost, useResetGiftLink} from '@tryghost/admin-x-framework/api/gift-links';

vi.mock('@src/utils/analytics', () => ({default: vi.fn()}));
vi.mock('@tryghost/admin-x-framework/hooks', () => ({useHandleError: () => vi.fn()}));
vi.mock('@tryghost/admin-x-framework/api/gift-links', () => ({
    useGiftLinkForPost: vi.fn(),
    useEnsureGiftLink: vi.fn(),
    useResetGiftLink: vi.fn()
}));

const writeText = vi.fn().mockResolvedValue(undefined);

function mockLink(overrides = {}) {
    return {id: 'gl1', post_id: 'p1', token: 'tok123', status: 'active', redeemed_count: 0, last_redeemed_at: null, created_at: '', updated_at: null, ...overrides};
}

describe('GiftLinkSection', () => {
    let ensure: ReturnType<typeof vi.fn>;
    let reset: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        vi.clearAllMocks();
        Object.defineProperty(navigator, 'clipboard', {value: {writeText}, configurable: true});
        ensure = vi.fn().mockResolvedValue({gift_links: [mockLink({token: 'newtok'})]});
        reset = vi.fn().mockResolvedValue({gift_links: [mockLink({token: 'resettok'})]});
        vi.mocked(useEnsureGiftLink).mockReturnValue({mutateAsync: ensure} as never);
        vi.mocked(useResetGiftLink).mockReturnValue({mutateAsync: reset, isLoading: false} as never);
        vi.mocked(useGiftLinkForPost).mockReturnValue({data: undefined} as never);
    });

    it('fires the surface-viewed event on mount', () => {
        render(<GiftLinkSection postId="p1" postUrl="https://example.com/p/" />);
        expect(trackEvent).toHaveBeenCalledWith('gift_link_surface_viewed', {surface: 'post-share-modal'});
    });

    it('ensures a link on first copy, copies the gift URL, and tracks the copy', async () => {
        render(<GiftLinkSection postId="p1" postUrl="https://example.com/p/" />);

        fireEvent.click(screen.getByTestId('gift-link-copy'));

        await waitFor(() => expect(ensure).toHaveBeenCalledWith({id: 'p1'}));
        expect(writeText).toHaveBeenCalledWith('https://example.com/p/?gift=newtok&utm_campaign=gift-link');
        expect(trackEvent).toHaveBeenCalledWith('gift_link_copied', {surface: 'post-share-modal'});
    });

    it('shows the count + reset when an active link exists, and copy ensures (idempotent) the current token', async () => {
        vi.mocked(useGiftLinkForPost).mockReturnValue({data: {gift_links: [mockLink({token: 'existing', redeemed_count: 5})]}} as never);
        // Idempotent ensure returns the *current* active token from the server.
        ensure.mockResolvedValue({gift_links: [mockLink({token: 'existing'})]});

        render(<GiftLinkSection postId="p1" postUrl="https://example.com/p/" />);

        expect(screen.getByTestId('gift-link-count')).toHaveTextContent('Opened 5 times');
        expect(screen.getByTestId('gift-link-reset')).toBeInTheDocument();

        fireEvent.click(screen.getByTestId('gift-link-copy'));

        // Always ensures (so it never copies a stale/just-reset token) then copies the returned token
        await waitFor(() => expect(ensure).toHaveBeenCalledWith({id: 'p1'}));
        expect(writeText).toHaveBeenCalledWith('https://example.com/p/?gift=existing&utm_campaign=gift-link');
    });

    it('resets the link and tracks the reset', async () => {
        vi.mocked(useGiftLinkForPost).mockReturnValue({data: {gift_links: [mockLink()]}} as never);

        render(<GiftLinkSection postId="p1" postUrl="https://example.com/p/" />);

        fireEvent.click(screen.getByTestId('gift-link-reset'));

        await waitFor(() => expect(reset).toHaveBeenCalledWith({id: 'p1'}));
        expect(trackEvent).toHaveBeenCalledWith('gift_link_reset', {surface: 'post-share-modal'});
    });

    it('does not show count/reset until a link exists', () => {
        render(<GiftLinkSection postId="p1" postUrl="https://example.com/p/" />);
        expect(screen.queryByTestId('gift-link-count')).toBeNull();
        expect(screen.queryByTestId('gift-link-reset')).toBeNull();
    });
});
