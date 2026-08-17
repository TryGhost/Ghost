import React from 'react';
import {Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, LoadingIndicator} from '@tryghost/shade/components';
import {getMemberSigninUrl} from '@tryghost/admin-x-framework/api/members';
import {toast} from 'sonner';
import {useQueryClient} from '@tanstack/react-query';

interface MemberImpersonateModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    memberId: string;
}

/**
 * Modal that fetches a 24-hour signin/impersonation URL for the given member and
 * lets the admin copy it. Matches Ember `modal-impersonate-member`:
 *   - Fetches lazily (only when the modal opens) so the URL isn't minted on every
 *     page render.
 *   - Copy button flashes "Copied" for 1s (Ember's `copySigninUrl` task uses the
 *     same 1s window).
 */
const MemberImpersonateModal: React.FC<MemberImpersonateModalProps> = ({open, onOpenChange, memberId}) => {
    const queryClient = useQueryClient();
    // On every modal open, drop the cached signin URL so we don't serve a stale
    // (potentially expired 24-hour) link from a previous open. Ember's original
    // modal fetches fresh in didInsertElement — this reproduces that guarantee.
    React.useEffect(() => {
        if (open) {
            queryClient.removeQueries({queryKey: ['MemberSigninUrlResponseType']});
        }
    }, [open, queryClient]);

    const {data, isFetching, isError} = getMemberSigninUrl(memberId, {
        enabled: open,
        defaultErrorHandler: false
    });
    const signinUrl = data?.url ?? '';
    // A 200 with an empty/missing envelope is still a failure from the admin's
    // point of view — surface it as an error rather than showing a blank input.
    const isEmptyResponse = !isFetching && !isError && !signinUrl;
    const hasError = isError || isEmptyResponse;

    const [justCopied, setJustCopied] = React.useState(false);
    const copyResetTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearCopyResetTimer = React.useCallback(() => {
        if (copyResetTimerRef.current !== null) {
            clearTimeout(copyResetTimerRef.current);
            copyResetTimerRef.current = null;
        }
    }, []);
    React.useEffect(() => {
        // Cancel a pending "Copied → Copy link" reset when the modal closes so
        // a late tick can't flip the label on the next open.
        if (!open) {
            clearCopyResetTimer();
            setJustCopied(false);
        }
    }, [open, clearCopyResetTimer]);
    React.useEffect(() => clearCopyResetTimer, [clearCopyResetTimer]);

    const onCopy = async () => {
        try {
            await navigator.clipboard.writeText(signinUrl);
            setJustCopied(true);
            clearCopyResetTimer();
            copyResetTimerRef.current = setTimeout(() => {
                setJustCopied(false);
                copyResetTimerRef.current = null;
            }, 1000);
        } catch {
            toast.error('Couldn’t copy the impersonation link');
        }
    };

    const inputValue = isFetching
        ? 'Generating link…'
        : (hasError ? 'Failed to generate link' : signinUrl);

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent data-testid='impersonate-modal'>
                <DialogHeader>
                    <DialogTitle>Impersonate member</DialogTitle>
                    <DialogDescription>
                        A single-use signin link that works for 24 hours. Anyone with the link can sign in as this member.
                    </DialogDescription>
                </DialogHeader>

                <div className='flex flex-col gap-1.5'>
                    <Label htmlFor='member-signin-url'>Signin link</Label>
                    <Input
                        data-testid='member-signin-url'
                        id='member-signin-url'
                        value={inputValue}
                        readOnly
                    />
                </div>

                <DialogFooter>
                    <Button variant='outline' onClick={() => onOpenChange(false)}>Close</Button>
                    <Button disabled={isFetching || hasError || !signinUrl} onClick={() => void onCopy()}>
                        {isFetching ? (
                            <>
                                <LoadingIndicator size='sm' />
                                <span className='sr-only'>Generating link</span>
                            </>
                        ) : (justCopied ? 'Copied' : 'Copy link')}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default MemberImpersonateModal;
