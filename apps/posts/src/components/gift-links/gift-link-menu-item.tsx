import React from 'react';
import copyToClipboard from '@src/utils/copy-to-clipboard';
import trackEvent from '@src/utils/analytics';
import {DropdownMenuItem} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {toast} from 'sonner';
import {useEnsureGiftLink, useGiftLinkForPost} from '@tryghost/admin-x-framework/api/gift-links';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const SURFACE = 'post-share-menu';

interface GiftLinkMenuItemProps {
    postId: string;
    postUrl: string;
    onManage: () => void;
    onClose: () => void;
}

/**
 * Share-menu entry for a post's gift link. Reads "Generate gift link" until one
 * exists, then "Copy gift link"; either way the click idempotently ensures the
 * link and copies it. Once a link exists, a cog opens the manage modal (full
 * URL, open count, reset).
 *
 * The row drives copy/manage from explicit child clicks rather than Radix's
 * row-level `onSelect` — a single row with two targets can't reliably tell which
 * was clicked through Radix's delegated select, so `onSelect` is disabled and we
 * close the (controlled) menu ourselves.
 */
const GiftLinkMenuItem: React.FC<GiftLinkMenuItemProps> = ({postId, postUrl, onManage, onClose}) => {
    const handleError = useHandleError();
    const {data} = useGiftLinkForPost(postId);
    const {mutateAsync: ensureGiftLink} = useEnsureGiftLink();
    const exists = Boolean(data?.gift_links?.[0]);

    const handleCopyOrGenerate = async () => {
        try {
            // Idempotent: returns the current active token (creating it on first
            // use), so copy never grabs a stale token from the read query.
            const response = await ensureGiftLink({id: postId});
            await copyToClipboard(buildGiftLinkUrl(postUrl, response.gift_links[0].token));
            trackEvent('gift_link_copied', {surface: SURFACE});
            toast.success('Gift link copied');
        } catch (e) {
            handleError(e);
        }
    };

    const copyAndClose = () => {
        void handleCopyOrGenerate();
        onClose();
    };

    return (
        <DropdownMenuItem
            className="flex items-center justify-between gap-0 p-0"
            data-testid="gift-link-menu-item"
            onKeyDown={(e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    copyAndClose();
                }
            }}
            onSelect={e => e.preventDefault()}
        >
            <span
                className="flex flex-1 cursor-pointer items-center gap-2 py-1.5 pl-2"
                onClick={copyAndClose}
            >
                <LucideIcon.Gift className="shrink-0" size={16} />
                {exists ? 'Copy gift link' : 'Generate gift link'}
            </span>
            {exists && (
                <button
                    aria-label="Manage gift link"
                    className="mr-1.5 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                    data-testid="gift-link-manage"
                    type="button"
                    onClick={onManage}
                >
                    <LucideIcon.Settings size={16} />
                </button>
            )}
        </DropdownMenuItem>
    );
};

export default GiftLinkMenuItem;
