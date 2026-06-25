import React, {useEffect, useRef, useState} from 'react';
import {Badge, Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle} from '@tryghost/shade/components';
import {GiftLinkResource, useCreateGiftLink, useEnsureGiftLink} from '@tryghost/admin-x-framework/api/gift-links';
import {ShareModal} from '@tryghost/shade/patterns';
import {buildGiftLinkUrl} from '@src/utils/gift-link';
import {formatNumber} from '@tryghost/shade/utils';
import {useGiftLinkUsage} from '@src/hooks/use-gift-link-usage';
import {useHandleError} from '@tryghost/admin-x-framework/hooks';
import {usePostDetails} from '@src/hooks/use-post-details';

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
    postId: string;
    resource?: GiftLinkResource;
}

const GiftLinkModal: React.FC<GiftLinkModalProps> = ({open, onOpenChange, postId, resource = 'posts'}) => {
    const handleError = useHandleError();
    const {mutateAsync: ensureGiftLink} = useEnsureGiftLink();
    const {mutateAsync: createGiftLink} = useCreateGiftLink();
    const {post} = usePostDetails({postId, resource, enabled: open});

    const [token, setToken] = useState<string | undefined>(undefined);
    const [resetState, setResetState] = useState<ResetState>('idle');
    const [resetting, setResetting] = useState(false);
    const [ensuring, setEnsuring] = useState(false);
    const cancelResetRef = useRef<HTMLButtonElement>(null);

    // Usage is best-effort: undefined when analytics is off / unavailable, in
    // which case we simply omit the visitor count.
    const {usage} = useGiftLinkUsage({postUuid: post?.uuid, token, enabled: open});

    // Ensure (create-or-get) the link as soon as the modal opens so there's a
    // URL to show. Idempotent on the server.
    useEffect(() => {
        if (!open) {
            return;
        }
        let cancelled = false;
        setEnsuring(true);
        ensureGiftLink({id: postId, resource})
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

    const giftLinkUrl = buildGiftLinkUrl(post?.url, token);
    const memberType = post?.visibility === 'members' ? 'member' : 'paid member';
    const description = `Anyone you share this link with will be able to access this post without becoming a ${memberType}.`;

    const handleConfirmReset = async () => {
        if (resetting) {
            return;
        }
        setResetting(true);
        try {
            const response = await createGiftLink({id: postId, resource});
            setToken(response.gift_links[0]?.token);
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
                            />
                        </ShareModal.CopyURLBox>

                        <DialogFooter className='sm:items-center sm:justify-between'>
                            <Button
                                className='border-destructive/20 text-destructive hover:border-destructive hover:bg-transparent hover:text-destructive'
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
                                Are you sure you want to reset this link? Anyone with the current link will lose access to this post.
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
