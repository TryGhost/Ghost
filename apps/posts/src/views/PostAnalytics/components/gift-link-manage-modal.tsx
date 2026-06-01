import React, {useState} from 'react';
import copyToClipboard from '@src/utils/copy-to-clipboard';
import trackEvent from '@src/utils/analytics';
import {Button, Dialog, DialogClose, DialogContent, DialogDescription, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
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
                <DialogClose
                    aria-label="Close"
                    className="absolute top-4 right-4 rounded-sm text-muted-foreground outline-hidden transition-colors hover:text-foreground"
                >
                    <LucideIcon.X size={20} strokeWidth={1.5} />
                    <span className="sr-only">Close</span>
                </DialogClose>
                <DialogHeader>
                    <DialogTitle>Gift link</DialogTitle>
                    <DialogDescription>
                        Anyone with access to this link can view the full post.
                    </DialogDescription>
                </DialogHeader>
                <div className="flex min-w-0 flex-col gap-4">
                    {/* The whole box copies; the top-right label is just the affordance.
                        The URL wraps (break-all) so the changing token tail stays
                        visible after a reset. */}
                    <button
                        className="group block w-full rounded-md border bg-muted p-3 text-left text-sm leading-relaxed transition-colors hover:border-muted-foreground/30"
                        data-testid="gift-link-copybox"
                        type="button"
                        onClick={handleCopy}
                    >
                        {/* Float the Copy affordance so the URL wraps around and
                            beneath it, keeping it in line with the first line. */}
                        <span className="float-right ml-3 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground group-hover:text-foreground">
                            {copied ? <LucideIcon.Check size={13} /> : <LucideIcon.Copy size={13} />}
                            {copied ? 'Copied' : 'Copy'}
                        </span>
                        <span className="break-all" data-testid="gift-link-url">{url}</span>
                    </button>
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
                        Resetting turns off this link and creates a new one.
                    </p>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default GiftLinkManageModal;
