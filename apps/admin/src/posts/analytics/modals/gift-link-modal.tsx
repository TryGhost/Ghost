import React, {useCallback, useEffect, useRef, useState} from 'react';
import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {type GiftLinkResource, useCreateGiftLink, useEnsureGiftLink} from '@tryghost/admin-x-framework/api/gift-links';
import {ShareModal} from '@tryghost/shade/patterns';
import {buildGiftLinkUrl} from '@/posts/analytics/utils/gift-link';
import {formatNumber} from '@tryghost/shade/utils';
import {trackEvent} from '@tryghost/admin-x-framework';
import {useGiftLinkUsage} from '@/posts/analytics/hooks/use-gift-link-usage';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {usePostDetails} from '@/posts/analytics/hooks/use-post-details';

function visitorsLabel(count: number) {
    if (count === 0) {
        return 'No visitors yet';
    }
    return `${formatNumber(count)} ${count === 1 ? 'visitor' : 'visitors'}`;
}

type ResetState = 'idle' | 'confirm';

export type GiftLinkModalSource = 'share-modal' | 'context-menu' | 'gift-link-card';

interface GiftLinkModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    postId: string;
    resource?: GiftLinkResource;
    source: GiftLinkModalSource;
}

const GiftLinkModal: React.FC<GiftLinkModalProps> = ({open, onOpenChange, postId, resource = 'posts', source}) => {
    const handleError = useHandleError();
    const {mutateAsync: ensureGiftLink} = useEnsureGiftLink();
    const {mutateAsync: createGiftLink} = useCreateGiftLink();
    const {post} = usePostDetails({postId, resource, enabled: open});

    const [token, setToken] = useState<string | undefined>(undefined);
    const [resetState, setResetState] = useState<ResetState>('idle');
    const [resetting, setResetting] = useState(false);
    const [ensuring, setEnsuring] = useState(false);
    const cancelResetRef = useRef<HTMLButtonElement>(null);
    const ensureGiftLinkRequestRef = useRef<{
        postId: string;
        resource: GiftLinkResource;
        request: ReturnType<typeof ensureGiftLink>;
    } | null>(null);

    // Usage is best-effort: undefined when analytics is off / unavailable, in
    // which case we simply omit the visitor count.
    const {usage} = useGiftLinkUsage({postUuid: post?.uuid, token, enabled: open});

    // Ensure (create-or-get) the link as soon as the modal opens so there's a
    // URL to show. Share one request per open target so StrictMode effect replay
    // and local re-renders don't mint competing same-moment links.
    useEffect(() => {
        if (!open) {
            ensureGiftLinkRequestRef.current = null;
            setEnsuring(false);
            return;
        }

        let ensureRequest = ensureGiftLinkRequestRef.current;
        if (ensureRequest?.postId !== postId || ensureRequest.resource !== resource) {
            ensureRequest = {
                postId,
                resource,
                request: ensureGiftLink({id: postId, resource})
            };
            ensureGiftLinkRequestRef.current = ensureRequest;
        }

        let cancelled = false;
        setEnsuring(true);
        ensureRequest.request
            .then((response) => {
                if (cancelled) {
                    return;
                }
                setToken(response.gift_links[0]?.token);
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
    }, [open, postId, resource, ensureGiftLink, handleError]);

    useEffect(() => {
        if (resetState === 'confirm') {
            cancelResetRef.current?.focus();
        }
    }, [resetState]);

    const postType = resource === 'pages' ? 'page' : 'post';
    const visibility = post?.visibility ?? 'unknown';

    // Track the open once per open, but only after post details load so the
    // visibility property is populated.
    const openTrackedRef = useRef(false);
    useEffect(() => {
        if (!open) {
            openTrackedRef.current = false;
            return;
        }
        if (openTrackedRef.current || !post) {
            return;
        }
        openTrackedRef.current = true;
        trackEvent('Gift Link Modal Opened', {postType, visibility, source});
    }, [open, post, postType, visibility, source]);

    const giftLinkUrl = buildGiftLinkUrl(post?.url, token);
    const memberType = post?.visibility === 'members' ? 'member' : 'paid member';
    const description = `Anyone you share this link with will be able to access this ${postType} without becoming a ${memberType}.`;

    const handleConfirmReset = useCallback(async () => {
        if (resetting) {
            return;
        }
        setResetting(true);
        try {
            const response = await createGiftLink({id: postId, resource});
            setToken(response.gift_links[0]?.token);
            setResetState('idle');
            trackEvent('Gift Link Reset', {postType, visibility, source});
        } catch (e) {
            handleError(e);
        } finally {
            setResetting(false);
        }
    }, [resetting, createGiftLink, postId, resource, handleError, postType, visibility, source]);

    const handleOpenChange = useCallback((isOpen: boolean) => {
        if (!isOpen) {
            setResetState('idle');
        }
        onOpenChange(isOpen);
    }, [onOpenChange]);

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className='max-w-lg gap-5'>
                {resetState === 'idle' && (
                    <>
                        <DialogHeader className='gap-3'>
                            <div className='flex items-center gap-2'>
                                <DialogTitle className='text-xl leading-none'>Gift link</DialogTitle>
                                {usage && (
                                    <Badge
                                        data-testid='gift-link-views'
                                        variant='secondary'
                                    >
                                        {visitorsLabel(usage.visits)}
                                    </Badge>
                                )}
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
                                disabled={ensuring || !giftLinkUrl}
                                icon='link'
                                size='sm'
                                onClick={() => trackEvent('Gift Link Copied', {postType, visibility, source})}
                            />
                        </ShareModal.CopyURLBox>

                        <DialogFooter className='sm:items-center sm:justify-between'>
                            <Button
                                className='border-destructive/20 text-destructive hover:border-destructive hover:bg-transparent hover:text-destructive dark:border-state-danger/50 dark:text-state-danger dark:hover:border-state-danger dark:hover:bg-transparent dark:hover:text-state-danger'
                                data-testid='reset-gift-link'
                                disabled={!giftLinkUrl}
                                variant='outline'
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
                                Are you sure you want to reset this link? Anyone with the current link will lose access to this {postType}.
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
