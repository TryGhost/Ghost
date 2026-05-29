import React, {useEffect, useState} from 'react';
import trackEvent from '@src/utils/analytics';
import {Button} from '@tryghost/shade/components';
import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {useEnsureGiftLink, useGiftLinkForPost, useResetGiftLink} from '@tryghost/admin-x-framework/api/gift-links';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

const SURFACE = 'post-share-modal';

interface GiftLinkSectionProps {
    postId: string;
    postUrl: string;
}

/**
 * Gift-link controls inside the share modal: copy an always-on link that lets
 * anyone read the full gated post, see how many distinct readers have opened it
 * (a leak signal), and reset it to invalidate a leaked link.
 */
const GiftLinkSection: React.FC<GiftLinkSectionProps> = ({postId, postUrl}) => {
    const handleError = useHandleError();
    const {data} = useGiftLinkForPost(postId);
    const {mutateAsync: ensureGiftLink} = useEnsureGiftLink();
    const {mutateAsync: resetGiftLink, isLoading: isResetting} = useResetGiftLink();
    const [copied, setCopied] = useState(false);

    // L1 exposure: the section is only mounted when the share modal is opened.
    useEffect(() => {
        trackEvent('gift_link_surface_viewed', {surface: SURFACE});
    }, []);

    const activeLink = data?.gift_links?.[0];

    const handleCopy = async () => {
        try {
            // Idempotent ensure: reuse the active link or mint one on first copy.
            const response = activeLink ? {gift_links: [activeLink]} : await ensureGiftLink({id: postId});
            const link = response.gift_links[0];
            await navigator.clipboard.writeText(buildGiftLinkUrl(postUrl, link.token));
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
        } catch (e) {
            handleError(e);
        }
    };

    return (
        <div className="flex flex-col gap-2 border-t pt-4" data-testid="gift-link-section">
            <div>
                <strong className="text-sm">Gift this post</strong>
                <p className="text-sm text-muted-foreground">
                    Share a link that lets anyone read the full post — no account needed.
                </p>
            </div>
            <div className="flex items-center gap-2">
                <Button data-testid="gift-link-copy" onClick={handleCopy}>
                    {copied ? 'Copied' : 'Copy gift link'}
                </Button>
                {activeLink && (
                    <>
                        <span className="text-sm text-muted-foreground" data-testid="gift-link-count">
                            Opened {activeLink.redeemed_count} {activeLink.redeemed_count === 1 ? 'time' : 'times'}
                        </span>
                        <Button
                            data-testid="gift-link-reset"
                            disabled={isResetting}
                            variant="outline"
                            onClick={handleReset}
                        >
                            Reset link
                        </Button>
                    </>
                )}
            </div>
        </div>
    );
};

export default GiftLinkSection;
