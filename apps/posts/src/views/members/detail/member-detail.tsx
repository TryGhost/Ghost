import MainLayout from '@components/layout/main-layout';
import MemberDetailForm from './member-detail-form';
import MemberDetailSidebar from './member-detail-sidebar';
import MemberNewslettersField from './member-newsletters-field';
import MemberSubscriptionsSection from './member-subscriptions-section';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, type ButtonProps, Card, CardContent, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {DetailPage} from '@tryghost/shade/page-templates';
import {Link, useConfirmUnload, useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {PageHeader} from '@tryghost/shade/patterns';
import {buildMemberFieldEditPayload, getMemberEditableSlice, getMemberNewslettersUiEnabled, isDraftInSyncWithServer, isValidMemberEmail, normalizeDraftForComparison} from './member-detail-edit';
import {dequal} from 'dequal';
import {deriveMemberDetailBackPath} from './member-detail-nav';
import {formatMemberName} from '@tryghost/shade/app';
import {getMember, useAddMember, useEditMember} from '@tryghost/admin-x-framework/api/members';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import type {MemberEditableFields} from './member-detail-edit';

// The create screen reuses this route with the sentinel id "new". Safe because
// real member ids are 24-char hex ObjectIds and can't collide with this literal.
const CREATE_ID = 'new';

const MemberDetail: React.FC = () => {
    const {member_id: memberId = ''} = useParams<{member_id: string}>();
    const location = useLocation();
    const navigate = useNavigate();
    const backPath = deriveMemberDetailBackPath(location.search);
    const isCreating = memberId === CREATE_ID;

    // `include=tiers` mirrors the Ember route so complimentary tiers arrive with the member.
    const {data, isLoading} = getMember(memberId, {
        enabled: !!memberId && !isCreating,
        searchParams: {include: 'tiers'},
        defaultErrorHandler: false
    });
    const member = data?.members?.[0];
    const notFound = !isCreating && !isLoading && !member;

    const editMutation = useEditMember();
    const addMutation = useAddMember();
    const activeMutation = isCreating ? addMutation : editMutation;

    // `paid_members_enabled` gates the subscriptions section: sites without paid
    // memberships never see subscription UI. Matches Ember's `paidMembersEnabled`
    // check in `gh-member-settings-form.hbs:82`.
    // `editor_default_email_recipients` gates the newsletters section (Ember hides
    // the whole thing when set to `'disabled'`).
    const {data: settingsData} = useBrowseSettings({});
    const paidMembersEnabled = getSettingValue<boolean>(settingsData?.settings, 'paid_members_enabled') === true;
    const newslettersUiEnabled = getMemberNewslettersUiEnabled(
        getSettingValue<string>(settingsData?.settings, 'editor_default_email_recipients')
    );

    // Draft holds the user's in-progress edits; the query cache stays server truth.
    const [draft, setDraft] = React.useState<MemberEditableFields | undefined>(undefined);
    const draftMemberIdRef = React.useRef<string | undefined>(undefined);
    const lastServerSliceRef = React.useRef<MemberEditableFields | undefined>(undefined);
    // Lets the post-create redirect through the unsaved-changes blocker.
    const bypassGuardRef = React.useRef(false);
    React.useEffect(() => {
        if (isCreating) {
            if (draftMemberIdRef.current !== CREATE_ID) {
                draftMemberIdRef.current = CREATE_ID;
                const empty = getMemberEditableSlice({});
                lastServerSliceRef.current = empty;
                setDraft(empty);
            }
            return;
        }
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
        // refetchOnMount): adopt it only if the user hasn't edited.
        const previousServerSlice = lastServerSliceRef.current;
        lastServerSliceRef.current = nextServerSlice;
        setDraft(prev => (isDraftInSyncWithServer(prev, previousServerSlice) ? nextServerSlice : prev));
    }, [member, isCreating]);

    // Reset the create-redirect bypass whenever the route target changes.
    React.useEffect(() => {
        bypassGuardRef.current = false;
    }, [memberId]);

    // Create compares against an empty baseline; edit against the loaded member.
    const serverSlice = isCreating ? getMemberEditableSlice({}) : (member ? getMemberEditableSlice(member) : undefined);
    const hasUnsavedChanges = !!draft && !!serverSlice && !dequal(normalizeDraftForComparison(draft), serverSlice);
    const emailValid = !!draft && isValidMemberEmail(draft.email);
    const emailError = draft && !emailValid
        ? (draft.email.trim() === '' ? 'Email is required.' : 'Invalid email.')
        : null;

    const onFieldChange = (patch: Partial<MemberEditableFields>) => {
        if (activeMutation.isError) {
            activeMutation.reset();
        }
        setDraft(prev => (prev ? {...prev, ...patch} : prev));
    };

    const onSave = () => {
        if (!draft || !hasUnsavedChanges || !emailValid || activeMutation.isLoading) {
            return;
        }

        if (isCreating) {
            addMutation.mutate({
                email: draft.email.trim(),
                name: draft.name.trim() || undefined,
                note: draft.note.trim() || undefined,
                labels: draft.labels.length ? draft.labels : undefined
            }, {
                onSuccess: (response) => {
                    const created = response.members?.[0];
                    if (!created) {
                        // Server said OK but returned no member — surface it as an error
                        // so the user isn't stranded on a form that quietly resubmits.
                        toast.error('Member couldn’t be created');
                        return;
                    }
                    // Skip the unsaved-changes guard for our own redirect to the
                    // freshly-created member.
                    bypassGuardRef.current = true;
                    toast.success('Member created');
                    navigate(`/members/preview/${created.id}`, {replace: true});
                },
                onError: () => {
                    toast.error('Member couldn’t be created');
                }
            });
            return;
        }

        // Guard against saving a draft that belongs to a different member.
        if (!member || draftMemberIdRef.current !== member.id) {
            return;
        }
        editMutation.mutate(buildMemberFieldEditPayload(member.id, draft, getMemberEditableSlice(member)), {
            onSuccess: (response) => {
                const saved = response.members?.[0];
                if (saved) {
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

    useConfirmUnload(activeMutation.isLoading || hasUnsavedChanges);
    const blocker = useBlocker(({currentLocation, nextLocation}) => !bypassGuardRef.current && hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname);
    const isBlocked = blocker.state === 'blocked';

    // Save button state (Save / Saving / Saved / Retry), mirroring the Ember task button.
    let saveLabel: React.ReactNode = 'Save';
    let saveVariant: ButtonProps['variant'] = 'outline';
    let saveDisabled = true;
    if (activeMutation.isLoading) {
        saveLabel = <><LoadingIndicator size='sm' /><span className='sr-only'>Saving</span></>;
    } else if (hasUnsavedChanges) {
        saveLabel = activeMutation.isError ? 'Retry' : 'Save';
        saveVariant = activeMutation.isError ? 'destructive' : 'default';
        saveDisabled = !emailValid;
    } else if (!isCreating && editMutation.isSuccess) {
        saveLabel = 'Saved';
    }

    const showEditor = !!draft && (isCreating || !!member);
    const title = isCreating ? 'New member' : (member ? formatMemberName(member) : 'Member not found');

    return (
        <MainLayout>
            <DetailPage data-testid='member-detail'>
                <DetailPage.Header>
                    <PageHeader blurredBackground={false} sticky={false}>
                        <PageHeader.Left>
                            {/*
                              * Breadcrumb sits directly under Left rather than inside
                              * PageHeader.Breadcrumb — that slot adds a `pt-1` offset that
                              * only makes sense when a title stacks below the breadcrumb.
                              */}
                            <Breadcrumb>
                                <BreadcrumbList>
                                    <BreadcrumbItem>
                                        <BreadcrumbLink asChild>
                                            <Link data-test-link='members-back' to={backPath}>Members</Link>
                                        </BreadcrumbLink>
                                    </BreadcrumbItem>
                                    <BreadcrumbSeparator />
                                    <BreadcrumbItem>
                                        {!isCreating && isLoading ? (
                                            <Skeleton className='h-4 w-40' />
                                        ) : (
                                            <BreadcrumbPage className='truncate' data-testid='member-detail-title'>
                                                {title}
                                            </BreadcrumbPage>
                                        )}
                                    </BreadcrumbItem>
                                </BreadcrumbList>
                            </Breadcrumb>
                        </PageHeader.Left>
                        {(isCreating || member) && (
                            <PageHeader.Actions>
                                <PageHeader.ActionGroup>
                                    <Button disabled={saveDisabled} variant={saveVariant} onClick={onSave}>
                                        {saveLabel}
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        )}
                    </PageHeader>
                </DetailPage.Header>

                <DetailPage.Body>
                    {notFound && (
                        <div className='flex flex-1 items-center justify-center'>
                            <p className='text-muted-foreground'>This member couldn’t be found.</p>
                        </div>
                    )}

                    {showEditor && draft && (
                        <div className='flex flex-1 flex-col gap-8 lg:flex-row lg:items-start'>
                            <MemberDetailSidebar draftEmail={draft.email} draftName={draft.name} member={member} />
                            <div className='flex min-w-0 flex-1 flex-col gap-8'>
                                {/* First card: name, email, labels, note — no external header. */}
                                <Card>
                                    <CardContent className='p-6'>
                                        <MemberDetailForm
                                            disabled={activeMutation.isLoading}
                                            draft={draft}
                                            emailError={emailError}
                                            onChange={onFieldChange}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Newsletters section owns its external heading + card so an empty
                                    newsletter list hides the whole thing (returns null). */}
                                {newslettersUiEnabled && !isCreating && member && (
                                    <MemberNewslettersField
                                        disabled={activeMutation.isLoading}
                                        emailSuppression={member.email_suppression}
                                        memberId={member.id}
                                        subscribedIds={draft.newsletters}
                                        onChange={nextIds => onFieldChange({newsletters: nextIds})}
                                    />
                                )}

                                {/* Subscriptions: external "SUBSCRIPTIONS" label + own card. */}
                                {member && !isCreating && paidMembersEnabled && (member.subscriptions?.length ?? 0) > 0 && (
                                    <section aria-labelledby='member-subscriptions-heading' className='flex flex-col gap-3'>
                                        <h3 className='text-xs font-semibold tracking-wide text-muted-foreground uppercase' id='member-subscriptions-heading'>Subscriptions</h3>
                                        <MemberSubscriptionsSection member={member} paidMembersEnabled={paidMembersEnabled} />
                                    </section>
                                )}
                            </div>
                        </div>
                    )}
                </DetailPage.Body>

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
            </DetailPage>
        </MainLayout>
    );
};

export default MemberDetail;
