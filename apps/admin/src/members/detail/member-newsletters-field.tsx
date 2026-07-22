import React from 'react';
import {Button, Card, CardContent, LoadingIndicator, Switch} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getMemberSuppressionInfo, toggleMemberNewsletter} from './member-detail-edit';
import {toast} from 'sonner';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useRemoveMemberEmailSuppression, useMembersFetching} from '@tryghost/admin-x-framework/api/members';
import type {Member} from '@tryghost/admin-x-framework/api/members';

interface MemberNewslettersFieldProps {
    // Optional so the create screen (/members/new) can render the toggles
    // without a saved member yet — matches Ember, which shows the newsletter
    // preferences on new members (`gh-member-settings-form.hbs:74-80`).
    // Suppression logic is skipped when the member doesn't exist.
    memberId?: string;
    emailSuppression?: Member['email_suppression'];
    subscribedIds: string[];
    disabled?: boolean;
    onChange: (subscribedIds: string[]) => void;
}

const MemberNewslettersField: React.FC<MemberNewslettersFieldProps> = ({
    memberId,
    emailSuppression,
    subscribedIds,
    disabled,
    onChange
}) => {
    // A new member can't be suppressed yet — skip the suppression branch
    // entirely by treating a missing memberId as "not suppressed".
    const suppression = memberId ? getMemberSuppressionInfo(emailSuppression) : null;
    const removeSuppression = useRemoveMemberEmailSuppression();

    // Ember only shows active newsletters; archived ones are managed elsewhere and
    // must not be flipped through this UI. If a member is subscribed to an archived
    // newsletter, the server keeps it silently (`member-repository.js:791-798`).
    // TODO: pagination — `useBrowseNewsletters` is an infinite query but this field
    // only reads the first page (limit 50). Sites with 51+ active newsletters would
    // not see the tail here.
    const {data, isLoading} = useBrowseNewsletters({searchParams: {filter: 'status:active', limit: '50'}});
    const newsletters = data?.newsletters ?? [];

    // Keep the Re-enable button in a loading state until the invalidated member
    // refetch lands (`useRemoveMemberEmailSuppression` invalidates the members query
    // on success). Without this, the mutation resolves, `isLoading` flips back to
    // false, but `emailSuppression` is still stale for a beat — the banner stays,
    // the button re-enables, and the user can spam-click it.
    const membersRefetching = useMembersFetching();
    const reEnableBusy = removeSuppression.isPending || (removeSuppression.isSuccess && membersRefetching);

    const noNewsletters = !suppression && (isLoading || newsletters.length === 0);
    if (noNewsletters) {
        return null;
    }

    const onReEnable = () => {
        // Guarded by `suppression` above — a new member can't have a
        // suppression record, so `memberId` is always defined when this runs.
        if (!memberId) {
            return;
        }
        removeSuppression.mutate({id: memberId}, {
            onSuccess: () => toast.success('Email re-enabled successfully'),
            onError: () => toast.error('Failed to re-enable email. Please try again.')
        });
    };

    // The whole section — external heading + card — is owned by this component
    // so an empty-newsletters state can hide it cleanly (returning null above).
    return (
        <section aria-labelledby='member-newsletters-heading' className='flex flex-col gap-3' data-testid='member-newsletters-field'>
            <h3 className='text-base font-semibold' id='member-newsletters-heading'>Newsletters</h3>
            <Card>
                <CardContent className='p-6'>
                    {suppression ? (
                <div className='flex items-center justify-between gap-4' data-testid='member-suppression-banner'>
                    <div className='flex items-start gap-3'>
                        <LucideIcon.MailX className='mt-0.5 shrink-0 text-muted-foreground' size={20} />
                        <div className='min-w-0'>
                            <div className='font-medium'>Email disabled</div>
                            {suppression.label && (
                                <p className='text-sm text-muted-foreground'>{suppression.label}</p>
                            )}
                            <a
                                className='text-sm text-muted-foreground hover:underline'
                                href='https://ghost.org/help/disabled-emails'
                                rel='noopener noreferrer'
                                target='_blank'
                            >
                                Learn more
                            </a>
                        </div>
                    </div>
                    <Button
                        disabled={disabled || reEnableBusy}
                        onClick={onReEnable}
                    >
                        {reEnableBusy ? (
                            <>
                                <LoadingIndicator size='sm' />
                                <span className='sr-only'>Re-enabling email</span>
                            </>
                        ) : 'Re-enable email'}
                    </Button>
                </div>
            ) : (
                <>
                    <ul className='divide-y divide-border'>
                        {newsletters.map((newsletter) => {
                            const checked = subscribedIds.includes(newsletter.id);
                            return (
                                <li key={newsletter.id} className='flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0'>
                                    <div className='min-w-0'>
                                        <div className='font-medium'>{newsletter.name}</div>
                                        {newsletter.description && (
                                            <p className='truncate text-sm text-muted-foreground'>{newsletter.description}</p>
                                        )}
                                    </div>
                                    <Switch
                                        aria-label={`Subscribe to ${newsletter.name}`}
                                        checked={checked}
                                        data-testid='member-subscription-toggle'
                                        disabled={disabled}
                                        onCheckedChange={() => onChange(toggleMemberNewsletter(subscribedIds, newsletter.id))}
                                    />
                                </li>
                            );
                        })}
                    </ul>
                    <p className='mt-4 text-sm text-muted-foreground'>
                        If disabled, member will <em>not</em> receive newsletter emails
                    </p>
                </>
            )}
                </CardContent>
            </Card>
        </section>
    );
};

export default MemberNewslettersField;
