import {StrictMode} from 'react';
import GiftLinkModal from '@src/views/PostAnalytics/modals/gift-link-modal';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {render, screen, waitFor} from '@testing-library/react';

const {
    mockCreateGiftLink,
    mockEnsureGiftLink,
    mockHandleError,
    mockUseGiftLinkUsage,
    mockUsePostDetails
} = vi.hoisted(() => ({
    mockCreateGiftLink: vi.fn(),
    mockEnsureGiftLink: vi.fn(),
    mockHandleError: vi.fn(),
    mockUseGiftLinkUsage: vi.fn(),
    mockUsePostDetails: vi.fn()
}));

vi.mock('@tryghost/admin-x-framework/api/gift-links', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/api/gift-links')>(
        '@tryghost/admin-x-framework/api/gift-links'
    );
    return {
        ...actual,
        useCreateGiftLink: () => ({
            mutateAsync: mockCreateGiftLink
        }),
        useEnsureGiftLink: () => ({
            mutateAsync: mockEnsureGiftLink
        })
    };
});

vi.mock('@tryghost/admin-x-framework/hooks', async () => {
    const actual = await vi.importActual<typeof import('@tryghost/admin-x-framework/hooks')>(
        '@tryghost/admin-x-framework/hooks'
    );
    return {
        ...actual,
        useHandleError: () => mockHandleError
    };
});

vi.mock('@src/hooks/use-gift-link-usage', () => ({
    useGiftLinkUsage: (...args: unknown[]) => mockUseGiftLinkUsage(...args)
}));

vi.mock('@src/hooks/use-post-details', () => ({
    usePostDetails: (...args: unknown[]) => mockUsePostDetails(...args)
}));

describe('GiftLinkModal', () => {
    beforeEach(() => {
        vi.clearAllMocks();

        mockEnsureGiftLink.mockResolvedValue({
            gift_links: [{
                token: 'gift-token',
                created_at: '2026-07-01T00:00:00.000Z'
            }]
        });
        mockCreateGiftLink.mockResolvedValue({
            gift_links: [{
                token: 'reset-token',
                created_at: '2026-07-01T00:00:00.000Z'
            }]
        });
        mockUseGiftLinkUsage.mockReturnValue({usage: undefined, loading: false, error: null});
        mockUsePostDetails.mockReturnValue({
            post: {
                title: 'Test post',
                url: 'https://example.com/test-post/',
                uuid: 'post-uuid',
                visibility: 'members'
            },
            isLoading: false
        });
    });

    it('ensures the gift link once when opened under StrictMode', async () => {
        render(
            <StrictMode>
                <GiftLinkModal postId='post-id' source='share-modal' open onOpenChange={vi.fn()} />
            </StrictMode>
        );

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(1);
        });
        expect(mockEnsureGiftLink).toHaveBeenCalledWith({id: 'post-id', resource: 'posts'});
        expect(await screen.findByText('https://example.com/test-post/?gift=gift-token')).toBeInTheDocument();
    });

    it('ensures again after the modal is closed and reopened', async () => {
        const {rerender} = render(
            <GiftLinkModal postId='post-id' source='share-modal' open onOpenChange={vi.fn()} />
        );

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(1);
        });

        rerender(<GiftLinkModal open={false} postId='post-id' source='share-modal' onOpenChange={vi.fn()} />);
        rerender(<GiftLinkModal postId='post-id' source='share-modal' open onOpenChange={vi.fn()} />);

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(2);
        });
    });

    it('ensures again when the open modal receives a different post id', async () => {
        const {rerender} = render(
            <GiftLinkModal postId='post-id' source='share-modal' open onOpenChange={vi.fn()} />
        );

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(1);
        });

        rerender(<GiftLinkModal postId='other-post-id' source='share-modal' open onOpenChange={vi.fn()} />);

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(2);
        });
        expect(mockEnsureGiftLink).toHaveBeenLastCalledWith({id: 'other-post-id', resource: 'posts'});
    });

    it('ensures again when the open modal receives a different resource', async () => {
        const {rerender} = render(
            <GiftLinkModal postId='post-id' resource='posts' source='share-modal' open onOpenChange={vi.fn()} />
        );

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(1);
        });

        rerender(<GiftLinkModal postId='post-id' resource='pages' source='share-modal' open onOpenChange={vi.fn()} />);

        await waitFor(() => {
            expect(mockEnsureGiftLink).toHaveBeenCalledTimes(2);
        });
        expect(mockEnsureGiftLink).toHaveBeenLastCalledWith({id: 'post-id', resource: 'pages'});
    });
});
