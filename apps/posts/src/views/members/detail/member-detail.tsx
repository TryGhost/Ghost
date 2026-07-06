import MainLayout from '@components/layout/main-layout';
import MemberDetailForm from './member-detail-form';
import MemberDetailSidebar from './member-detail-sidebar';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Button, type ButtonProps, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {Link, useConfirmUnload, useLocation, useParams} from '@tryghost/admin-x-framework';
import {LucideIcon} from '@tryghost/shade/utils';
import {buildMemberFieldEditPayload, getMemberEditableSlice, isDraftInSyncWithServer, isValidMemberEmail} from './member-detail-edit';
import {dequal} from 'dequal';
import {deriveMemberDetailBackPath} from './member-detail-nav';
import {formatMemberName} from '@tryghost/shade/app';
import {getMember, useEditMember} from '@tryghost/admin-x-framework/api/members';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import type {MemberEditableFields} from './member-detail-edit';

const MemberDetail: React.FC = () => {
    const {member_id: memberId = ''} = useParams<{member_id: string}>();
    const location = useLocation();
    const backPath = deriveMemberDetailBackPath(location.search);

    // `include=tiers` mirrors the Ember route so complimentary tiers arrive with the member.
    const {data, isLoading} = getMember(memberId, {
        enabled: !!memberId,
        searchParams: {include: 'tiers'},
        defaultErrorHandler: false
    });
    const member = data?.members?.[0];
    const notFound = !isLoading && !member;

    const editMutation = useEditMember();

    // Draft holds the user's in-progress edits; the query cache stays server truth.
    const [draft, setDraft] = React.useState<MemberEditableFields | undefined>(undefined);
    const draftMemberIdRef = React.useRef<string | undefined>(undefined);
    const lastServerSliceRef = React.useRef<MemberEditableFields | undefined>(undefined);
    React.useEffect(() => {
        if (!member) {
            return;
        }
        const nextServerSlice = getMemberEditableSlice(member);
        if (draftMemberIdRef.current !== member.id) {
            // A different member loaded → start fresh from its server values.
            draftMemberIdRef.current = member.id;
            lastServerSliceRef.current = nextServerSlice;
            setDraft(nextServerSlice);
            return;
        }
        // Same member, fresh server data (posts queries use staleTime:0 +
        // refetchOnMount, so a cached detail can refetch): adopt it only when the
        // user hasn't edited, so a refetch never turns unchanged data into a false
        // "unsaved changes".
        const previousServerSlice = lastServerSliceRef.current;
        lastServerSliceRef.current = nextServerSlice;
        setDraft(prev => (isDraftInSyncWithServer(prev, previousServerSlice) ? nextServerSlice : prev));
    }, [member]);

    const serverSlice = member ? getMemberEditableSlice(member) : undefined;
    // Compare normalized slices so a whitespace-only edit doesn't read as dirty (which
    // would enable Save for a no-op and arm the navigation guard needlessly).
    const hasUnsavedChanges = !!draft && !!serverSlice && !dequal(getMemberEditableSlice(draft), serverSlice);
    const emailValid = !!draft && isValidMemberEmail(draft.email);
    const emailError = draft && !emailValid
        ? (draft.email.trim() === '' ? 'Email is required.' : 'Invalid email.')
        : null;

    const onFieldChange = (patch: Partial<MemberEditableFields>) => {
        // Clear a prior save error the moment the user edits, so the button drops the
        // lingering "Retry" and returns to a normal "Save".
        if (editMutation.isError) {
            editMutation.reset();
        }
        setDraft(prev => (prev ? {...prev, ...patch} : prev));
    };

    const onSave = () => {
        // Guard against saving a draft that belongs to a different member than the
        // one currently loaded.
        if (!draft || !member || draftMemberIdRef.current !== member.id || !hasUnsavedChanges || !emailValid || editMutation.isLoading) {
            return;
        }
        editMutation.mutate(buildMemberFieldEditPayload(member.id, draft), {
            onSuccess: (response) => {
                const saved = response.members?.[0];
                if (saved) {
                    // Advance the baseline + draft to the saved values so the brief
                    // window before the refetch lands stays consistent.
                    const savedSlice = getMemberEditableSlice(saved);
                    lastServerSliceRef.current = savedSlice;
                    setDraft(savedSlice);
                }
                toast.success('Member updated');
            },
            onError: () => {
                toast.error('Member couldn’t be saved');
            }
        });
    };

    useConfirmUnload(editMutation.isLoading || hasUnsavedChanges);
    const blocker = useBlocker(({currentLocation, nextLocation}) => hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname);
    const isBlocked = blocker.state === 'blocked';

    // Save button state (Save / Saving / Saved / Retry), mirroring the Ember task button.
    // A prior save error only shows as "Retry" while there are still unsaved changes to
    // retry — reverting the edits drops it back to a disabled "Save" rather than leaving
    // an enabled destructive button that no-ops.
    let saveLabel: React.ReactNode = 'Save';
    let saveVariant: ButtonProps['variant'] = 'outline';
    let saveDisabled = true;
    if (editMutation.isLoading) {
        saveLabel = <><LoadingIndicator size='sm' /><span className='sr-only'>Saving</span></>;
    } else if (hasUnsavedChanges) {
        saveLabel = editMutation.isError ? 'Retry' : 'Save';
        saveVariant = editMutation.isError ? 'destructive' : 'default';
        saveDisabled = !emailValid;
    } else if (editMutation.isSuccess) {
        saveLabel = 'Saved';
    }

    return (
        <MainLayout>
            <div className='flex h-full flex-col' data-testid='member-detail'>
                <header className='flex h-14 shrink-0 items-center gap-3 border-b border-border px-2'>
                    <Button aria-label='Back to members' variant='ghost' asChild>
                        <Link data-test-link='members-back' to={backPath}>
                            <LucideIcon.ArrowLeft strokeWidth={2} />
                        </Link>
                    </Button>
                    {isLoading ? (
                        <Skeleton className='h-6 w-48' />
                    ) : (
                        <h1 className='min-w-0 flex-1 truncate text-xl font-semibold tracking-tight' data-testid='member-detail-title'>
                            {member ? formatMemberName(member) : 'Member not found'}
                        </h1>
                    )}
                    {member && (
                        <Button disabled={saveDisabled} variant={saveVariant} onClick={onSave}>
                            {saveLabel}
                        </Button>
                    )}
                </header>

                {notFound && (
                    <div className='flex flex-1 items-center justify-center'>
                        <p className='text-muted-foreground'>This member couldn’t be found.</p>
                    </div>
                )}

                {member && draft && (
                    <div className='flex flex-1 flex-col gap-8 overflow-y-auto p-6 lg:flex-row-reverse lg:items-start'>
                        <MemberDetailSidebar member={member} />
                        <div className='min-w-0 flex-1'>
                            <MemberDetailForm disabled={editMutation.isLoading} draft={draft} emailError={emailError} onChange={onFieldChange} />
                        </div>
                    </div>
                )}

                <AlertDialog open={isBlocked} onOpenChange={(open) => {
                    if (!open && isBlocked) {
                        blocker.reset?.();
                    }
                }}>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
                            <AlertDialogDescription>Your changes will be lost if you leave this member.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogCancel>Keep editing</AlertDialogCancel>
                            <Button variant='destructive' onClick={() => blocker.proceed?.()}>Leave</Button>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
        </MainLayout>
    );
};

export default MemberDetail;
