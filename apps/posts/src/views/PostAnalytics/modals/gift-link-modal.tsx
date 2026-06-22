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

function viewsLabel(count: number) {
    if (count === 0) {
        return 'No views yet';
    }
    return `${formatNumber(count)} ${count === 1 ? 'view' : 'views'}`;
}

type ResetState = 'idle' | 'confirm' | 'done';

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
    const [viewCount, setViewCount] = useState(0);
    const [resetState, setResetState] = useState<ResetState>('idle');
    const [resetting, setResetting] = useState(false);
    const [ensuring, setEnsuring] = useState(false);
    const openRef = useRef(open);
    const cancelResetRef = useRef<HTMLButtonElement>(null);

    // Ensure (create-or-get) the link as soon as the modal opens, so we have a
    // URL to show and an up-to-date view count. Idempotent on the server.
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
                    setViewCount(link.redeemed_count);
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
        openRef.current = open;
        if (!open) {
            setResetState('idle');
        }
    }, [open]);

    useEffect(() => {
        if (resetState !== 'done') {
            return;
        }

        const timeout = window.setTimeout(() => setResetState('idle'), 1700);
        return () => window.clearTimeout(timeout);
    }, [resetState]);

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
                setViewCount(link.redeemed_count);
            }
            if (openRef.current) {
                setResetState('done');
            }
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

    const isConfirmingReset = resetState === 'confirm';

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='flex max-w-lg flex-col gap-0 overflow-hidden p-0'>
                <div className={`transition-colors duration-200 motion-reduce:transition-none ${isConfirmingReset ? 'bg-muted/90 dark:bg-muted/80' : 'bg-transparent'}`}>
                    <div className={`flex flex-col gap-3 px-6 pt-6 pb-2 transition-[filter] duration-200 motion-reduce:transition-none ${isConfirmingReset ? 'blur-[1.5px]' : 'blur-0'}`}>
                        <DialogHeader className='gap-3'>
                            <div className='flex items-center gap-2'>
                                <DialogTitle className='text-xl leading-none'>Gift link</DialogTitle>
                                <Badge
                                    data-testid='gift-link-views'
                                    variant='secondary'
                                >
                                    {viewsLabel(viewCount)}
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
                    </div>
                </div>

                <DialogFooter className='!flex-row !items-center !justify-between gap-3 bg-popover p-6'>
                    {resetState === 'idle' && (
                        <div className='flex w-full animate-in items-center justify-between gap-3 duration-150 fade-in-0 motion-reduce:animate-none'>
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
                        </div>
                    )}

                    {resetState === 'confirm' && (
                        <div className='flex w-full animate-in items-center justify-between gap-3 duration-150 fade-in-0 motion-reduce:animate-none'>
                            <span className='text-sm font-medium whitespace-nowrap text-foreground'>Reset this link?</span>
                            <div className='flex items-center gap-2'>
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
                            </div>
                        </div>
                    )}

                    {resetState === 'done' && (
                        <div className='flex w-full animate-in items-center justify-between gap-3 duration-150 fade-in-0 motion-reduce:animate-none' role='status'>
                            <span className='text-sm font-medium whitespace-nowrap text-foreground'>Link reset</span>
                            <Button variant='outline' onClick={() => handleOpenChange(false)}>
                                Close
                            </Button>
                        </div>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default GiftLinkModal;
