import React from 'react';
import {Label, Switch} from '@tryghost/shade/components';
import {toggleMemberNewsletter} from './member-detail-edit';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';

interface MemberNewslettersFieldProps {
    subscribedIds: string[];
    disabled?: boolean;
    onChange: (subscribedIds: string[]) => void;
}

const MemberNewslettersField: React.FC<MemberNewslettersFieldProps> = ({subscribedIds, disabled, onChange}) => {
    // Ember only shows active newsletters; archived ones are managed elsewhere and
    // must not be flipped through this UI. If a member is subscribed to an archived
    // newsletter, the server keeps it silently (`member-repository.js:791-798`), so
    // omitting it from the toggle list can't cause data loss.
    // TODO: pagination — `useBrowseNewsletters` is an infinite query but this field
    // only reads the first page (limit 50). Sites with 51+ active newsletters would
    // not see the tail here.
    const {data, isLoading} = useBrowseNewsletters({searchParams: {filter: 'status:active', limit: '50'}});
    const newsletters = data?.newsletters ?? [];

    // Hide the entire section — heading included — while loading or when a site
    // genuinely has no active newsletters, so the user never sees a bare label with
    // an empty body underneath.
    if (isLoading || newsletters.length === 0) {
        return null;
    }

    return (
        <div className='flex flex-col gap-3' data-testid='member-newsletters-field'>
            <Label>Newsletters</Label>
            {newsletters.map((newsletter) => {
                const checked = subscribedIds.includes(newsletter.id);
                return (
                    <div key={newsletter.id} className='flex items-center justify-between gap-4'>
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
                    </div>
                );
            })}
        </div>
    );
};

export default MemberNewslettersField;
