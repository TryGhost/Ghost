import React, {useState} from 'react';
import copyToClipboard from '@src/utils/copy-to-clipboard';
import trackEvent from '@src/utils/analytics';
import {Button, Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {toast} from 'sonner';
import {useGiftLinkForPost, useResetGiftLink} from '@tryghost/admin-x-framework/api/gift-links';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const SURFACE = 'post-share-manage';

interface GiftLinkManageModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string;
    postUrl: string;
}

/**
 * Manage modal for a post's gift link: shows the full shareable URL, how many
 * distinct readers have opened it (a leak signal), and a reset action that
 * invalidates the current link and mints a fresh one.
 */
const GiftLinkManageModal: React.FC<GiftLinkManageModalProps> = ({open, onOpenChange, postId, postUrl}) => {
    const handleError = useHandleError();
    const {data} = useGiftLinkForPost(postId);
    const {mutateAsync: resetGiftLink, isLoading: isResetting} = useResetGiftLink();
    const [copied, setCopied] = useState(false);

    const activeLink = data?.gift_links?.[0];
    const url = activeLink ? buildGiftLinkUrl(postUrl, activeLink.token) : '';
    const count = activeLink?.redeemed_count ?? 0;

    const handleCopy = async () => {
        if (!url) {
            return;
        }
        try {
            await copyToClipboard(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            trackEvent('gift_link_copied', {surface: SURFACE});
        } catch (e) {
            handleError(e);
        }
    };

    const handleReset = async () => {
        try {
            await resetGiftLink({id: postId});
            trackEvent('gift_link_reset', {surface: SURFACE});
            toast.success('Gift link reset');
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-[480px]">
                <DialogHeader>
                    <DialogTitle>Gift link</DialogTitle>
                    <DialogDescription>
                        Anyone with this link can read the full post — no account needed.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex min-w-0 flex-col gap-4">
                    <div className="flex flex-col gap-2 rounded-md border bg-muted p-3">
                        {/* Wrap (break-all) rather than truncate so the changing
                            token tail stays visible after a reset. */}
                        <span className="text-sm break-all" data-testid="gift-link-url">{url}</span>
                        <Button className="self-end" size="sm" onClick={handleCopy}>
                            {copied ? 'Copied' : 'Copy'}
                        </Button>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                        <span className="text-sm text-muted-foreground" data-testid="gift-link-count">
                            Opened {count} {count === 1 ? 'time' : 'times'}
                        </span>
                        <Button
                            data-testid="gift-link-reset"
                            disabled={isResetting}
                            size="sm"
                            variant="outline"
                            onClick={handleReset}
                        >
                            Reset link
                        </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                        Resetting invalidates the current link so it can no longer be opened, and creates a new one.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GiftLinkManageModal;
