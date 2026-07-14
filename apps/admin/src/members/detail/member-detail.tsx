import MemberActionsMenu from './member-actions-menu';
import MemberActivityFeed from './member-activity-feed';
import MemberDetailForm from './member-detail-form';
import MemberDetailSidebar from './member-detail-sidebar';
import MemberNewslettersField from './member-newsletters-field';
import MemberSubscriptionsSection from './member-subscriptions-section';
import React from 'react';
import {AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, Button, type ButtonProps, Card, CardContent, LoadingIndicator, Skeleton} from '@tryghost/shade/components';
import {Box, Container} from '@tryghost/shade/primitives';
import {DetailPage} from '@tryghost/shade/page-templates';
import {Link, useConfirmUnload, useLocation, useNavigate, useParams} from '@tryghost/admin-x-framework';
import {PageHeader} from '@tryghost/shade/patterns';
import {buildMemberFieldEditPayload, getDefaultNewsletterIdsForNewMember, getEmailErrorMessage, getMemberEditableSlice, getMemberNewslettersUiEnabled, isDraftInSyncWithServer, isValidMemberEmail, normalizeDraftForComparison} from './member-detail-edit';
import {dequal} from 'dequal';
import {deriveMemberDetailBackPath} from './member-detail-nav';
import {formatMemberName} from '@tryghost/shade/app';
import {getMember, useAddMember, useEditMember} from '@tryghost/admin-x-framework/api/members';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {toast} from 'sonner';
import {useBlocker} from 'react-router';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import type {MemberEditableFields} from './member-detail-edit';

// The create screen reuses this route with the sentinel id "new". Safe because
// real member ids are 24-char hex ObjectIds and can't collide with this literal.
const CREATE_ID = 'new';

interface MemberDetailPageProps {
    // Which sections the site's settings allow. Resolved by the container below
    // so this component never has to reason about half-loaded settings.
    paidMembersEnabled: boolean;
    newslettersUiEnabled: boolean;
    engagementEnabled: boolean;
}

const MemberDetailPage: React.FC<MemberDetailPageProps> = ({paidMembersEnabled, newslettersUiEnabled, engagementEnabled}) => {
    const {member_id: memberId = ''} = useParams<{member_id: string}>();
    const location = useLocation();
    const navigate = useNavigate();
    const backPath = deriveMemberDetailBackPath(location.search);
    const isCreating = memberId === CREATE_ID;

    // `include=tiers` mirrors the Ember route so complimentary tiers arrive with the member.
    const {data, isLoading, error, refetch} = getMember(memberId, {
        enabled: !!memberId && !isCreating,
        searchParams: {include: 'tiers'},
        defaultErrorHandler: false
    });
    const member = data?.members?.[0];
    // 4xx from the members endpoint on a real id means "gone" (deleted mid-flow
    // is the realistic case). 5xx/network is a different story — we don't want
    // to lie about that with a "not found" message.
    const loadError = !isCreating && !isLoading && !!error;
    const notFound = !isCreating && !isLoading && !error && !member;

    const editMutation = useEditMember();
    const addMutation = useAddMember();
    const activeMutation = isCreating ? addMutation : editMutation;

    // "Add complimentary" is only meaningful when the site has at least one active
    // paid tier for the comp to reference. Skip the query entirely if paid members
    // aren't enabled — nothing on this screen consumes it in that case.
    const {data: tiersData} = useBrowseTiers({
        searchParams: {filter: 'type:paid+active:true', limit: 'all'},
        enabled: paidMembersEnabled
    });
    const canAddComp = (tiersData?.tiers?.length ?? 0) > 0;

    // Newsletter list is fetched inside `MemberNewslettersField`; react-query
    // dedupes matching query keys so re-querying here is free and lets us
    // derive `hasMultipleNewsletters` for the activity feed's newsletter rows.
    // We surface `newslettersResolved` too — the feed uses it to defer parsing
    // until the answer is known, avoiding a label churn from generic
    // "subscribed to newsletter" → specific "subscribed to Weekly".
    // Newsletters are fetched on BOTH create and edit modes: on create so we
    // can seed the draft with Ember's default subscriptions
    // (`subscribe_on_signup:true + visibility:members`, matching
    // `gh-member-settings-form.js:233-241`); on edit so the activity feed can
    // decide whether to render newsletter labels.
    const {data: newslettersData} = useBrowseNewsletters({
        searchParams: {filter: 'status:active', limit: '50'}
    });
    const newslettersResolved = newslettersData !== undefined;
    const hasMultipleNewsletters = (newslettersData?.newsletters?.length ?? 0) > 1;
    const hasMultipleTiers = (tiersData?.tiers?.length ?? 0) > 1;

    // Draft holds the user's in-progress edits; the query cache stays server truth.
    const [draft, setDraft] = React.useState<MemberEditableFields | undefined>(undefined);
    const draftMemberIdRef = React.useRef<string | undefined>(undefined);
    const lastServerSliceRef = React.useRef<MemberEditableFields | undefined>(undefined);
    // One-shot flag: have we seeded create-mode newsletter defaults yet? Reset
    // when re-entering create mode (draftMemberIdRef flips off CREATE_ID).
    const newsletterDefaultsSeededRef = React.useRef(false);
    // Lets the post-create redirect through the unsaved-changes blocker.
    const bypassGuardRef = React.useRef(false);
    React.useEffect(() => {
        if (isCreating) {
            if (draftMemberIdRef.current !== CREATE_ID) {
                draftMemberIdRef.current = CREATE_ID;
                newsletterDefaultsSeededRef.current = false;
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

    // Seed the create-mode draft with the Ember default newsletter set the
    // first time the newsletters query resolves. Runs at most once per
    // create-screen visit (`newsletterDefaultsSeededRef` is reset when
    // create mode is re-entered) so a user who deselects a default doesn't
    // have it re-checked by a background refetch. The seeded IDs also
    // become the "server slice" baseline, which keeps the Save button
    // disabled until the user actually changes something — the pre-checked
    // toggles don't read as unsaved changes.
    React.useEffect(() => {
        if (!isCreating || newsletterDefaultsSeededRef.current || !newslettersData?.newsletters) {
            return;
        }
        newsletterDefaultsSeededRef.current = true;
        const defaults = getDefaultNewsletterIdsForNewMember(newslettersData.newsletters);
        if (defaults.length === 0) {
            return;
        }
        // Seeded newsletters count as the baseline, not as an edit, so the ref
        // moves with the draft. Assigned here rather than inside the updater:
        // updaters must stay pure, since React may run them more than once.
        const seeded = {...(lastServerSliceRef.current ?? getMemberEditableSlice({})), newsletters: [...defaults].sort()};
        lastServerSliceRef.current = seeded;
        setDraft(prev => (prev ? {...prev, newsletters: [...defaults].sort()} : prev));
    }, [isCreating, newslettersData]);

    // In create mode the baseline is whatever the seeding effect has decided
    // (`lastServerSliceRef.current` = empty initial draft OR draft + default
    // newsletters once the newsletters query resolves). Using a fresh
    // `getMemberEditableSlice({})` here would treat the seeded defaults as
    // "unsaved changes" and trigger the beforeunload/nav-blocker on an
    // untouched form. In edit mode we still compare against the live server
    // value so a background refetch resurfaces external changes.
    const serverSlice = isCreating
        ? lastServerSliceRef.current
        : (member ? getMemberEditableSlice(member) : undefined);
    const hasUnsavedChanges = !!draft && !!serverSlice && !dequal(normalizeDraftForComparison(draft), serverSlice);
    const emailValid = !!draft && isValidMemberEmail(draft.email);
    // `touched` is set on the email field's first blur. That keeps the New
    // member screen from painting an "Email is required." error before the
    // user has done anything, matching Ember's save-time-only validator
    // (`ghost/admin/app/validators/member.js:15`). Reset below when the
    // member id or create-mode flag changes so a fresh screen starts clean.
    const [emailTouched, setEmailTouched] = React.useState(false);
    React.useEffect(() => {
        setEmailTouched(false);
    }, [member?.id, isCreating]);
    const emailError = draft ? getEmailErrorMessage(draft.email, emailTouched) : null;

    // The sidebar's identity block (avatar + heading) reads from a "committed"
    // copy of name/email that only advances on blur, not per keystroke.
    // Live-updating the avatar's gravatar/initials on every character felt
    // noisy while typing. Initialized from the saved member (edit) or empty
    // (create); synced on Save via the mutation success handler.
    const [committedIdentity, setCommittedIdentity] = React.useState<{name: string; email: string}>({name: '', email: ''});
    React.useEffect(() => {
        if (isCreating) {
            setCommittedIdentity({name: '', email: ''});
            return;
        }
        if (member) {
            setCommittedIdentity({name: member.name ?? '', email: member.email ?? ''});
        }
    }, [member?.id, member?.name, member?.email, isCreating]);
    const commitIdentityFromDraft = () => {
        if (draft) {
            setCommittedIdentity({name: draft.name, email: draft.email});
        }
    };

    const onFieldChange = (patch: Partial<MemberEditableFields>) => {
        if (activeMutation.isError) {
            activeMutation.reset();
        }
        setDraft(prev => (prev ? {...prev, ...patch} : prev));
    };

    const onSave = () => {
        if (!draft || !hasUnsavedChanges || !emailValid || activeMutation.isPending) {
            return;
        }
        // Sync committed identity so the sidebar avatar shows what's actively
        // being saved rather than the pre-blur value (in case the user hit
        // Save without tabbing out of the name/email field first).
        commitIdentityFromDraft();

        if (isCreating) {
            addMutation.mutate({
                email: draft.email.trim(),
                name: draft.name.trim() || undefined,
                note: draft.note.trim() || undefined,
                labels: draft.labels.length ? draft.labels : undefined,
                // Send the visibly-selected newsletter set ONLY once the
                // seeding effect has run. If the user manages to hit Save
                // before the newsletters query resolves, we don't have
                // a reliable "what would Ember show?" snapshot, so we omit
                // the key entirely and let the server apply its own default
                // (`member-repository.js:460-464`) — same effective outcome
                // as Ember's Ember-data unpopulated hasMany. An empty
                // seeded list (user deselected everything) is still sent
                // explicitly so the intent isn't lost to the server default.
                newsletters: newsletterDefaultsSeededRef.current
                    ? draft.newsletters.map(id => ({id}))
                    : undefined
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
                    navigate(`/members/${created.id}`, {replace: true});
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

    useConfirmUnload(activeMutation.isPending || hasUnsavedChanges);
    const blocker = useBlocker(({currentLocation, nextLocation}) => !bypassGuardRef.current && hasUnsavedChanges && currentLocation.pathname !== nextLocation.pathname);
    const isBlocked = blocker.state === 'blocked';

    // Save button state (Save / Saving / Saved / Retry), mirroring the Ember task button.
    let saveLabel: React.ReactNode = 'Save';
    let saveVariant: ButtonProps['variant'] = 'default';
    let saveDisabled = true;
    if (activeMutation.isPending) {
        saveLabel = <><LoadingIndicator size='sm' /><span className='sr-only'>Saving</span></>;
    } else if (hasUnsavedChanges) {
        saveLabel = activeMutation.isError ? 'Retry' : 'Save';
        saveVariant = activeMutation.isError ? 'destructive' : 'default';
        saveDisabled = !emailValid;
    } else if (!isCreating && editMutation.isSuccess) {
        saveLabel = 'Saved';
    }

    const showEditor = !!draft && (isCreating || !!member);
    // A failed load is not a missing member: claiming "not found" next to a
    // "couldn't load" body tells the admin two different things at once, and
    // the member may well still exist.
    let title = 'Member';
    if (isCreating) {
        title = 'New member';
    } else if (member) {
        title = formatMemberName(member);
    } else if (notFound) {
        title = 'Member not found';
    }

    return (
        <Box className='size-full'><Container className='relative flex h-full flex-col' size='page'>
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
                                    {member && !isCreating && (
                                        // key={member.id} unmounts+remounts on member change so
                                        // local modal state (`showDelete`, `cancelStripe`, etc.)
                                        // can't leak across members if the user navigates while a
                                        // modal is open.
                                        <MemberActionsMenu
                                            key={member.id}
                                            allowLeaveWithUnsavedChanges={() => {
                                                bypassGuardRef.current = true;
                                            }}
                                            member={member}
                                        />
                                    )}
                                    <Button className='min-w-16' disabled={saveDisabled} variant={saveVariant} onClick={onSave}>
                                        {saveLabel}
                                    </Button>
                                </PageHeader.ActionGroup>
                            </PageHeader.Actions>
                        )}
                    </PageHeader>
                </DetailPage.Header>

                <DetailPage.Body>
                    {loadError && (
                        <div className='flex flex-1 flex-col items-center justify-center gap-3' data-testid='member-detail-load-error'>
                            <p className='text-muted-foreground'>Couldn’t load this member.</p>
                            <Button variant='outline' onClick={() => void refetch()}>Retry</Button>
                        </div>
                    )}

                    {notFound && (
                        <div className='flex flex-1 items-center justify-center'>
                            <p className='text-muted-foreground'>This member couldn’t be found.</p>
                        </div>
                    )}

                    {showEditor && draft && (
                        <div className='flex flex-1 flex-col gap-8 lg:flex-row lg:items-start lg:gap-12'>
                            <MemberDetailSidebar draftEmail={committedIdentity.email} draftName={committedIdentity.name} engagementEnabled={engagementEnabled} member={member} />
                            <div className='flex min-w-0 flex-1 flex-col gap-8'>
                                {/* First card: name, email, labels, note — no external header. */}
                                <Card>
                                    <CardContent className='p-6'>
                                        <MemberDetailForm
                                            disabled={activeMutation.isPending}
                                            draft={draft}
                                            emailError={emailError}
                                            onChange={onFieldChange}
                                            onEmailBlur={() => {
                                                setEmailTouched(true);
                                                commitIdentityFromDraft();
                                            }}
                                            onNameBlur={commitIdentityFromDraft}
                                        />
                                    </CardContent>
                                </Card>

                                {/* Newsletters section owns its external heading + card so an empty
                                    newsletter list hides the whole thing (returns null). Renders
                                    on /members/new too so an admin can pick the initial
                                    subscription set at creation — matches Ember's
                                    `gh-member-settings-form.hbs:74-80`. */}
                                {newslettersUiEnabled && (isCreating || member) && (
                                    <MemberNewslettersField
                                        disabled={activeMutation.isPending}
                                        emailSuppression={member?.email_suppression}
                                        memberId={member?.id}
                                        subscribedIds={draft.newsletters}
                                        onChange={nextIds => onFieldChange({newsletters: nextIds})}
                                    />
                                )}

                                {/* Subscriptions: external "SUBSCRIPTIONS" label + own card. Matches
                                    Ember's `gh-member-settings-form.hbs:82`, which always renders
                                    the section under `{{#if paidMembersEnabled}}` — including on
                                    the New member screen, where the empty-state card shows a
                                    "No subscriptions" indicator until the member is created. The
                                    child component early-returns when there's nothing to show
                                    (no subs, no add-comp affordance available), matching Ember's
                                    `{{#unless this.tiers}}` branch. */}
                                {paidMembersEnabled && (
                                    <section aria-labelledby='member-subscriptions-heading' className='flex flex-col gap-3'>
                                        <h3 className='text-base font-semibold' id='member-subscriptions-heading'>Subscriptions</h3>
                                        <MemberSubscriptionsSection canAddComp={canAddComp} member={member} />
                                    </section>
                                )}

                                {/* Recent activity feed — Ember `activity-feed.hbs` shows the top
                                    5 events for a saved member, and switches to a "no events yet"
                                    empty state when `@member.isNew` (`activity-feed.hbs:2`).
                                    We mirror the same section wrapper for both states so the
                                    section header is consistent. `newslettersResolved` avoids a
                                    row-label churn when the newsletters query hasn't returned
                                    yet — irrelevant in create mode, so gate it on `!isCreating`. */}
                                {(isCreating || (member && newslettersResolved)) && (
                                    <MemberActivityFeed
                                        hasMultipleNewsletters={hasMultipleNewsletters}
                                        hasMultipleTiers={hasMultipleTiers}
                                        memberId={member?.id}
                                        paidMembersEnabled={paidMembersEnabled}
                                    />
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
        </Container></Box>
    );
};

/**
 * Resolves the settings that decide which sections this screen shows, so the
 * screen itself only ever sees settled answers. Reading them inline instead
 * means every gate has to pick a meaning for `undefined`, and the honest
 * choices disagree: a section defaulted off pops in when settings land, one
 * defaulted on flashes out. Following `members.tsx`, hold the chrome until the
 * answers exist.
 */
const MemberDetail: React.FC = () => {
    const {data: settingsData, isLoading: isSettingsLoading} = useBrowseSettings({});

    if (isSettingsLoading || !settingsData?.settings) {
        return (
            <Box className='size-full'><Container className='relative flex h-full flex-col' size='page'>
                <DetailPage>
                    <DetailPage.Body>
                        <div className='flex flex-1 items-center justify-center'>
                            <LoadingIndicator size='lg' />
                        </div>
                    </DetailPage.Body>
                </DetailPage>
            </Container></Box>
        );
    }

    const editorDefaultRecipients = getSettingValue<string>(settingsData.settings, 'editor_default_email_recipients');
    const membersSignupAccess = getSettingValue<string>(settingsData.settings, 'members_signup_access');

    return (
        <MemberDetailPage
            // Hidden when the site can't sign up members or has email disabled:
            // the numbers are always zero and only add noise. Mirrors Ember.
            engagementEnabled={membersSignupAccess !== 'none' && editorDefaultRecipients !== 'disabled'}
            newslettersUiEnabled={getMemberNewslettersUiEnabled(editorDefaultRecipients)}
            // Sites without paid memberships never see subscription UI.
            paidMembersEnabled={getSettingValue<boolean>(settingsData.settings, 'paid_members_enabled') === true}
        />
    );
};

export default MemberDetail;
