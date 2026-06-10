import MainLayout from '@components/layout/main-layout';
import {ActivityFeed} from './components/activity-feed';
import {AddTierDialog} from './components/add-tier-dialog';
import {
    Button,
    Form,
    FormControl,
    FormField,
    FormItem,
    FormLabel,
    FormMessage,
    Input,
    Textarea
} from '@tryghost/shade/components';
import {DeleteMemberDialog} from './components/delete-member-dialog';
import {DisableCommentingDialog} from './components/disable-commenting-dialog';
import {ImpersonateMemberDialog} from './components/impersonate-member-dialog';
import {Link, useNavigate, useSearchParams} from '@tryghost/admin-x-framework';
import {LogoutMemberDialog} from './components/logout-member-dialog';
import {LucideIcon} from '@tryghost/shade/utils';
import {MemberActionsMenu} from './components/member-actions-menu';
import {MemberDetailsSidebar} from './components/member-details-sidebar';
import {
    MemberFormValues,
    formValuesToEditMemberPayload,
    formValuesToNewMemberPayload,
    memberFormSchema,
    memberToFormValues,
    sortLabels,
    sortNewsletterIds
} from './member-form-schema';
import {MemberLabelsInput} from './components/member-labels-input';
import {MemberSubscriptions} from './components/member-subscriptions';
import {NewsletterPreferences} from './components/newsletter-preferences';
import {UnsavedChangesDialog, useUnsavedChangesBlocker} from '@components/unsaved-changes';
import {apiErrorMessage} from '@src/utils/api-error-message';
import {toast} from 'sonner';
import {
    useAddMember,
    useDeleteMember,
    useDisableMemberCommenting,
    useEditMember,
    useEditMemberSubscription,
    useEnableMemberCommenting,
    useSignoutMemberSessions
} from '@tryghost/admin-x-framework/api/members';
import {useEffect, useRef, useState} from 'react';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import type {Member} from '@tryghost/admin-x-framework/api/members';
import type {MemberAction} from './components/member-actions-menu';
import type {Newsletter} from '@tryghost/admin-x-framework/api/newsletters';
import type {Tier} from '@tryghost/admin-x-framework/api/tiers';

type SaveState = 'idle' | 'saved' | 'error';
type ActiveDialog = MemberAction | 'add-tier' | null;

export function MemberDetailForm({member, newsletters, paidTiers, timezone, canShowNewsletters, paidMembersEnabled, showEngagement, initialSaveState = 'idle', refetchMember}: {
    member?: Member;
    newsletters: Newsletter[];
    paidTiers: Tier[];
    timezone: string;
    canShowNewsletters: boolean;
    paidMembersEnabled: boolean;
    showEngagement: boolean;
    initialSaveState?: SaveState;
    refetchMember: () => Promise<unknown>;
}) {
    const isNew = !member;
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const {mutateAsync: addMember} = useAddMember();
    const {mutateAsync: editMember} = useEditMember();
    const {mutateAsync: deleteMember} = useDeleteMember();
    const {mutateAsync: signoutMember} = useSignoutMemberSessions();
    const {mutateAsync: disableCommenting} = useDisableMemberCommenting();
    const {mutateAsync: enableCommenting} = useEnableMemberCommenting();
    const {mutateAsync: editSubscription} = useEditMemberSubscription();

    const [saveState, setSaveState] = useState<SaveState>(initialSaveState);
    const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
    const [subscriptionLoadingKey, setSubscriptionLoadingKey] = useState<string | null>(null);
    // The Ember implementation used a drop-concurrency save task; this guards
    // against re-entrant submits (e.g. cmd+S key repeat) creating duplicates.
    const submitInFlightRef = useRef(false);

    // New members default to the newsletters that are subscribed on signup
    const defaultNewsletterIds = newsletters
        .filter(newsletter => newsletter.subscribe_on_signup && newsletter.visibility === 'members')
        .map(newsletter => newsletter.id);

    const form = useForm<MemberFormValues>({
        resolver: zodResolver(memberFormSchema),
        defaultValues: memberToFormValues(member, defaultNewsletterIds)
    });
    const {isDirty, isSubmitting} = form.formState;

    // mirrors the Ember member controller's back-path handling
    const backParam = searchParams.get('back');
    const postAnalytics = searchParams.get('post');
    let membersListPath = '/members';
    if (backParam?.startsWith('/members')) {
        membersListPath = backParam;
    } else if (postAnalytics) {
        membersListPath = `/members?post=${encodeURIComponent(postAnalytics)}`;
    }

    const memberTitle = isNew ? 'New member' : (member.name || member.email);

    // A save can resolve after the user has navigated away; don't yank them
    // back to this screen in that case.
    const unmountedRef = useRef(false);
    useEffect(() => {
        // re-arm on mount: StrictMode runs mount -> unmount -> mount, and the
        // cleanup from the throwaway pass must not leave the ref stuck on true
        unmountedRef.current = false;
        return () => {
            unmountedRef.current = true;
        };
    }, []);

    const unsavedChanges = useUnsavedChangesBlocker(form);

    const onSubmit = async (values: MemberFormValues) => {
        if (submitInFlightRef.current) {
            return;
        }
        submitInFlightRef.current = true;
        setSaveState('idle');

        try {
            if (isNew) {
                const response = await addMember(formValuesToNewMemberPayload(values));
                const createdMember = response.members[0];
                if (unmountedRef.current) {
                    return;
                }
                form.reset(memberToFormValues(createdMember));
                // replace the /members/new route with the created member's route
                navigate(`/members/${createdMember.id}`, {replace: true, state: {justSaved: true}});
            } else {
                const response = await editMember(formValuesToEditMemberPayload(member.id, values));
                const updatedMember = response.members[0];
                if (unmountedRef.current) {
                    return;
                }
                form.reset(memberToFormValues(updatedMember));
                setSaveState('saved');
            }
        } catch (error) {
            if (!unmountedRef.current) {
                setSaveState('error');
                toast.error(apiErrorMessage(error, 'Failed to save member'));
            }
        } finally {
            submitInFlightRef.current = false;
        }
    };

    // Client-side validation failures also flip the button to Retry (the
    // Ember task button behaved the same way)
    const onInvalid = () => {
        setSaveState('error');
    };

    // Match the Ember admin's cmd/ctrl+s shortcut
    const submitRef = useRef<() => void>(() => {});
    submitRef.current = () => form.handleSubmit(onSubmit, onInvalid)();
    useEffect(() => {
        const handler = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                submitRef.current();
            }
        };
        document.addEventListener('keydown', handler);
        return () => document.removeEventListener('keydown', handler);
    }, []);

    const handleDelete = async (cancelSubscriptions: boolean) => {
        try {
            await deleteMember({id: member!.id, cancelSubscriptions});
            setActiveDialog(null);
            // discard any unsaved edits so the blocker lets the navigation through
            form.reset();
            navigate(membersListPath);
        } catch (error) {
            setActiveDialog(null);
            toast.error(apiErrorMessage(error, 'Failed to delete member'));
        }
    };

    const handleLogout = async () => {
        try {
            await signoutMember({id: member!.id});
            setActiveDialog(null);
            toast.success(`${member!.name || member!.email} has been signed out from all devices.`);
        } catch (error) {
            setActiveDialog(null);
            toast.error(apiErrorMessage(error, 'Failed to sign out member'));
        }
    };

    const handleDisableCommenting = async (hideComments: boolean) => {
        try {
            await disableCommenting({
                id: member!.id,
                reason: 'Disabled from member settings',
                hideComments
            });
            setActiveDialog(null);
            await refetchMember();
            toast.success(`Commenting has been disabled for ${member!.name || member!.email}.`);
        } catch (error) {
            setActiveDialog(null);
            toast.error(apiErrorMessage(error, 'Failed to disable commenting'));
        }
    };

    const handleEnableCommenting = async () => {
        try {
            await enableCommenting({id: member!.id});
            await refetchMember();
            toast.success(`Commenting has been enabled for ${member!.name || member!.email}.`);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to enable commenting'));
        }
    };

    const handleMemberAction = (action: MemberAction) => {
        if (action === 'enable-commenting') {
            handleEnableCommenting();
            return;
        }
        setActiveDialog(action);
    };

    const handleCancelSubscription = async (subscriptionId: string, cancelAtPeriodEnd: boolean) => {
        setSubscriptionLoadingKey(subscriptionId);
        try {
            await editSubscription({
                memberId: member!.id,
                subscriptionId,
                cancel_at_period_end: cancelAtPeriodEnd
            });
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to update subscription'));
        } finally {
            setSubscriptionLoadingKey(null);
        }
    };

    const handleRemoveComplimentary = async (tierId: string) => {
        setSubscriptionLoadingKey(`complimentary-${tierId}`);
        try {
            const updatedTiers = (member!.tiers ?? [])
                .filter(tier => tier.id !== tierId)
                .map(tier => ({id: tier.id}));

            await editMember({
                id: member!.id,
                email: member!.email,
                tiers: updatedTiers
            });
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to remove complimentary subscription'));
        } finally {
            setSubscriptionLoadingKey(null);
        }
    };

    const handleAddComplimentary = async (tierId: string, expiryAt: string | null) => {
        try {
            // Adding a complimentary subscription cancels existing active subscriptions
            const activeSubscriptions = (member!.subscriptions ?? [])
                .filter(sub => ['active', 'trialing', 'unpaid', 'past_due'].includes(sub.status));
            for (const subscription of activeSubscriptions) {
                await editSubscription({
                    memberId: member!.id,
                    subscriptionId: subscription.id,
                    status: 'canceled'
                });
            }

            await editMember({
                id: member!.id,
                email: member!.email,
                tiers: [expiryAt ? {id: tierId, expiry_at: expiryAt} : {id: tierId}]
            });
            setActiveDialog(null);
        } catch (error) {
            toast.error(apiErrorMessage(error, 'Failed to add complimentary subscription'));
        }
    };

    let saveLabel = 'Save';
    if (isSubmitting) {
        saveLabel = 'Saving...';
    } else if (saveState === 'saved' && !isDirty) {
        saveLabel = 'Saved';
    } else if (saveState === 'error') {
        saveLabel = 'Retry';
    }

    return (
        <MainLayout data-testid="member-details-page">
            <div className="w-full overflow-y-auto">
                <div className="mx-auto w-full max-w-5xl px-6 py-8">
                    <header className="mb-8 flex items-center justify-between gap-4">
                        <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2 text-base">
                            <Link className="font-semibold text-muted-foreground hover:text-foreground" data-testid="members-back" to={membersListPath}>
                                Members
                            </Link>
                            <LucideIcon.ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                            <span className="truncate font-semibold" data-testid="member-details-title">
                                {memberTitle}
                            </span>
                        </nav>
                        <div className="flex shrink-0 items-center gap-2">
                            {!isNew && (
                                <MemberActionsMenu
                                    canComment={member.can_comment !== false}
                                    onAction={handleMemberAction}
                                />
                            )}
                            <Button disabled={isSubmitting} type="button" onClick={() => submitRef.current()}>
                                {saveLabel}
                            </Button>
                        </div>
                    </header>

                    <div className="grid gap-10 md:grid-cols-[280px_1fr]">
                        <MemberDetailsSidebar
                            member={member}
                            showEngagement={showEngagement}
                            timezone={timezone}
                            onEnableCommenting={handleEnableCommenting}
                        />

                        <div className="min-w-0">
                            <Form {...form}>
                                <form onSubmit={form.handleSubmit(onSubmit, onInvalid)}>
                                    <div className="rounded-lg border p-4">
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <FormField
                                                control={form.control}
                                                name="name"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Name</FormLabel>
                                                        <FormControl>
                                                            <Input autoFocus={isNew} {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                            <FormField
                                                control={form.control}
                                                name="email"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Email</FormLabel>
                                                        <FormControl>
                                                            <Input autoCapitalize="off" autoComplete="off" autoCorrect="off" {...field} />
                                                        </FormControl>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <FormField
                                                control={form.control}
                                                name="labels"
                                                render={({field}) => (
                                                    <MemberLabelsInput
                                                        value={field.value}
                                                        onChange={labels => field.onChange(sortLabels(labels))}
                                                    />
                                                )}
                                            />
                                        </div>

                                        <div className="mt-4">
                                            <FormField
                                                control={form.control}
                                                name="note"
                                                render={({field}) => (
                                                    <FormItem>
                                                        <FormLabel>Note <span className="font-normal text-muted-foreground">(not visible to member)</span></FormLabel>
                                                        <FormControl>
                                                            <Textarea className="min-h-24" {...field} />
                                                        </FormControl>
                                                        <p className="text-xs text-muted-foreground">
                                                            Maximum: <b>500</b> characters. You&rsquo;ve used {field.value.length}
                                                        </p>
                                                        <FormMessage />
                                                    </FormItem>
                                                )}
                                            />
                                        </div>
                                    </div>

                                    {canShowNewsletters && (
                                        <FormField
                                            control={form.control}
                                            name="newsletterIds"
                                            render={({field}) => (
                                                <NewsletterPreferences
                                                    member={member}
                                                    newsletters={newsletters}
                                                    subscribedIds={field.value}
                                                    onChange={ids => field.onChange(sortNewsletterIds(ids))}
                                                />
                                            )}
                                        />
                                    )}
                                </form>
                            </Form>

                            {paidMembersEnabled && !isNew && (
                                <MemberSubscriptions
                                    isSaving={isSubmitting}
                                    loadingKey={subscriptionLoadingKey}
                                    member={member}
                                    paidTiers={paidTiers}
                                    onAddComplimentary={() => setActiveDialog('add-tier')}
                                    onCancelSubscription={id => handleCancelSubscription(id, true)}
                                    onContinueSubscription={id => handleCancelSubscription(id, false)}
                                    onRemoveComplimentary={handleRemoveComplimentary}
                                />
                            )}

                            <ActivityFeed memberId={member?.id} />
                        </div>
                    </div>
                </div>
            </div>

            {!isNew && (
                <>
                    <ImpersonateMemberDialog
                        member={member}
                        open={activeDialog === 'impersonate'}
                        onOpenChange={open => setActiveDialog(open ? 'impersonate' : null)}
                    />
                    <LogoutMemberDialog
                        member={member}
                        open={activeDialog === 'logout'}
                        onConfirm={handleLogout}
                        onOpenChange={open => setActiveDialog(open ? 'logout' : null)}
                    />
                    <DisableCommentingDialog
                        member={member}
                        open={activeDialog === 'disable-commenting'}
                        onConfirm={handleDisableCommenting}
                        onOpenChange={open => setActiveDialog(open ? 'disable-commenting' : null)}
                    />
                    <DeleteMemberDialog
                        member={member}
                        open={activeDialog === 'delete'}
                        onConfirm={handleDelete}
                        onOpenChange={open => setActiveDialog(open ? 'delete' : null)}
                    />
                    {activeDialog === 'add-tier' && (
                        <AddTierDialog
                            member={member}
                            tiers={paidTiers}
                            open
                            onConfirm={handleAddComplimentary}
                            onOpenChange={open => setActiveDialog(open ? 'add-tier' : null)}
                        />
                    )}
                </>
            )}

            <UnsavedChangesDialog
                open={unsavedChanges.isBlocked}
                onLeave={unsavedChanges.leave}
                onStay={unsavedChanges.stay}
            />
        </MainLayout>
    );
}
