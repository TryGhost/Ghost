import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {Post, useGlobalData} from '@src/providers/post-analytics-context';
import {ShareModal} from '@tryghost/shade/patterns';
import {formatNumber} from '@tryghost/shade/utils';
import {useEffect, useRef, useState} from 'react';
import {useEnsureGiftLink, useResetGiftLink} from '@tryghost/admin-x-framework/api/gift-links';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';

// Mirrors app/utils/gift-link.js — kept in the React surface so the URL shape
// stays consistent if the gift-link UI lands here before the editor is migrated.
function buildGiftLinkUrl({blogUrl, slug, token}: {blogUrl?: string; slug?: string; token?: string}) {
    if (!blogUrl || !slug || !token) {
        return '';
    }
    const base = blogUrl.replace(/\/+$/, '');
    return `${base}/g/${encodeURIComponent(slug)}/?key=${encodeURIComponent(token)}&utm_campaign=gift-link`;
}

function visitorsLabel(count: number) {
    if (count === 0) {
        return 'No visitors yet';
    }
    return `${formatNumber(count)} ${count === 1 ? 'visitor' : 'visitors'}`;
}

type ResetState = 'idle' | 'confirm';

interface GiftLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    post: Post;
}

const GiftLinkModal: React.FC<GiftLinkModalProps> = ({open, onOpenChange, post}) => {
    const {site} = useGlobalData();
    const handleError = useHandleError();
    const {mutateAsync: ensureGiftLink} = useEnsureGiftLink();
    const {mutateAsync: resetGiftLink} = useResetGiftLink();

    const [token, setToken] = useState<string | undefined>(undefined);
    const [visitorCount, setVisitorCount] = useState(0);
    const [resetState, setResetState] = useState<ResetState>('idle');
    const [resetting, setResetting] = useState(false);
    const [ensuring, setEnsuring] = useState(false);
    const cancelResetRef = useRef<HTMLButtonElement>(null);

    // Ensure (create-or-get) the link as soon as the modal opens, so we have a
    // URL to show and an up-to-date visitor count. Idempotent on the server.
    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setEnsuring(true);
        ensureGiftLink(post.id)
            .then((response) => {
                if (cancelled) {
                    return;
                }
                const link = response.gift_links[0];
                if (link) {
                    setToken(link.token);
                    setVisitorCount(link.redeemed_count);
                }
            })
            .catch((e) => {
                if (!cancelled) {
                    handleError(e);
                }
            })
            .finally(() => {
                if (!cancelled) {
                    setEnsuring(false);
                }
            });
        return () => {
            cancelled = true;
        };
    }, [open, post.id, ensureGiftLink, handleError]);

    // Reset transient UI on close so the next open starts clean.
    useEffect(() => {
        if (!open) {
            setResetState('idle');
        }
    }, [open]);

    useEffect(() => {
        if (resetState === 'confirm') {
            cancelResetRef.current?.focus();
        }
    }, [resetState]);

    const giftLinkUrl = buildGiftLinkUrl({blogUrl: site?.url, slug: post.slug, token});
    const memberType = post.visibility === 'members' ? 'member' : 'paid member';
    const description = `Anyone you share this link with will be able to access this post without becoming a ${memberType}.`;

    const handleConfirmReset = async () => {
        if (resetting) {
            return;
        }
        setResetting(true);
        try {
            const response = await resetGiftLink(post.id);
            const link = response.gift_links[0];
            if (link) {
                setToken(link.token);
                setVisitorCount(link.redeemed_count);
            }
            setResetState('idle');
        } catch (e) {
            handleError(e);
        } finally {
            setResetting(false);
        }
    };

    const handleOpenChange = (isOpen: boolean) => {
        if (!isOpen) {
            setResetState('idle');
        }
        onOpenChange(isOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='max-w-lg gap-5'>
                {resetState === 'idle' && (
                    <>
                        <DialogHeader className='gap-3'>
                            <div className='flex items-center gap-2'>
                                <DialogTitle className='text-xl leading-none'>Gift link</DialogTitle>
                                <Badge
                                    data-testid='gift-link-views'
                                    variant='secondary'
                                >
                                    {visitorsLabel(visitorCount)}
                                </Badge>
                            </div>
                            <DialogDescription className='text-sm leading-5'>
                                {description}
                            </DialogDescription>
                        </DialogHeader>

                        <ShareModal.CopyURLBox className='w-full min-w-0' copyURL={ensuring ? 'Generating link…' : giftLinkUrl}>
                            <ShareModal.CopyButton
                                className='shrink-0'
                                copyURL={giftLinkUrl}
                                data-testid='copy-gift-link'
                                icon='link'
                                size='sm'
                            />
                        </ShareModal.CopyURLBox>

                        <DialogFooter className='sm:items-center sm:justify-between'>
                            <Button
                                data-testid='reset-gift-link'
                                disabled={!giftLinkUrl}
                                variant='destructive'
                                onClick={() => setResetState('confirm')}
                            >
                                Reset
                            </Button>
                            <Button variant='outline' onClick={() => handleOpenChange(false)}>
                                Close
                            </Button>
                        </DialogFooter>
                    </>
                )}

                {resetState === 'confirm' && (
                    <>
                        <DialogHeader>
                            <DialogTitle>Reset gift link</DialogTitle>
                            <DialogDescription>
                                Aare you sure you want to reset this link?
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter>
                            <Button ref={cancelResetRef} disabled={resetting} variant='outline' onClick={() => setResetState('idle')}>
                                Cancel
                            </Button>
                            <Button
                                data-testid='confirm-reset-gift-link'
                                disabled={resetting}
                                variant='destructive'
                                onClick={() => {
                                    void handleConfirmReset();
                                }}
                            >
                                {resetting ? 'Resetting' : 'Reset link'}
                            </Button>
                        </DialogFooter>
                    </>
                )}
            </DialogContent>
        </Dialog>
    );
};

export default GiftLinkModal;
