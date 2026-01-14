import React, {useCallback, useMemo} from 'react';
import {
    Button,
    Filter,
    FilterFieldConfig,
    Filters,
    Input,
    LucideIcon,
    cn
} from '@tryghost/shade';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';

interface MembersFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
    search: string;
    onSearchChange: (value: string) => void;
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
    filters,
    onFiltersChange,
    search,
    onSearchChange
}) => {
    const {data: labelsData} = useBrowseLabels({
        searchParams: {limit: 'all'}
    });

    const {data: tiersData} = useBrowseTiers({
        searchParams: {limit: 'all', filter: 'type:paid+active:true'}
    });

    const {data: offersData} = useBrowseOffers({
        searchParams: {limit: 'all'}
    });

    const filterFields: FilterFieldConfig[] = useMemo(
        () => [
            {
                group: 'Basic',
                fields: [
                    {
                        key: 'label',
                        label: 'Label',
                        type: 'select', // TODO: Support multi-select
                        icon: <LucideIcon.Tag className="size-4" />,
                        options:
                            labelsData?.labels.map(l => ({
                                value: l.slug,
                                label: l.name
                            })) || []
                    },
                    {
                        key: 'signup_attribution',
                        label: 'Signed up on',
                        type: 'text',
                        icon: <LucideIcon.MapPin className="size-4" />
                    },
                    {
                        key: 'created_at',
                        label: 'Created',
                        type: 'date',
                        icon: <LucideIcon.Calendar className="size-4" />
                    },
                    {
                        key: 'last_seen_at',
                        label: 'Last seen',
                        type: 'date',
                        icon: <LucideIcon.Eye className="size-4" />
                    }
                ]
            },
            {
                group: 'Subscription',
                fields: [
                    {
                        key: 'status',
                        label: 'Status',
                        type: 'select',
                        icon: <LucideIcon.Circle className="size-4" />,
                        options: [
                            {value: 'paid', label: 'Paid'},
                            {value: 'free', label: 'Free'},
                            {value: 'comped', label: 'Comped'}
                        ]
                    },
                    {
                        key: 'tier',
                        label: 'Tier',
                        type: 'select',
                        icon: <LucideIcon.Award className="size-4" />,
                        options:
                            tiersData?.tiers.map(t => ({
                                value: t.slug,
                                label: t.name
                            })) || []
                    },
                    {
                        key: 'subscriptions.status',
                        label: 'Stripe status',
                        type: 'select',
                        icon: <LucideIcon.CreditCard className="size-4" />,
                        options: [
                            {value: 'active', label: 'Active'},
                            {value: 'trialing', label: 'Trialing'},
                            {value: 'canceled', label: 'Canceled'},
                            {value: 'unpaid', label: 'Unpaid'},
                            {value: 'past_due', label: 'Past Due'},
                            {value: 'incomplete', label: 'Incomplete'},
                            {
                                value: 'incomplete_expired',
                                label: 'Incomplete - Expired'
                            }
                        ]
                    },
                    {
                        key: 'subscriptions.plan_interval',
                        label: 'Billing period',
                        type: 'select',
                        icon: <LucideIcon.CalendarClock className="size-4" />,
                        options: [
                            {value: 'month', label: 'Monthly'},
                            {value: 'year', label: 'Yearly'}
                        ]
                    },
                    {
                        key: 'subscriptions.start_date',
                        label: 'Subscription started',
                        type: 'date',
                        icon: <LucideIcon.Calendar className="size-4" />
                    },
                    {
                        key: 'subscriptions.current_period_end',
                        label: 'Next billing date',
                        type: 'date',
                        icon: <LucideIcon.CalendarClock className="size-4" />
                    },
                    {
                        key: 'offer_redemptions',
                        label: 'Offers',
                        type: 'select',
                        icon: <LucideIcon.Tag className="size-4" />,
                        options:
                            offersData?.offers?.map(o => ({
                                value: o.id,
                                label: o.name
                            })) || []
                    }
                ]
            },
            {
                group: 'Email',
                fields: [
                    {
                        key: 'newsletters.status',
                        label: 'Newsletter subscription',
                        type: 'select',
                        icon: <LucideIcon.Mail className="size-4" />,
                        options: [
                            {value: 'active', label: 'Subscribed'},
                            {value: 'archived', label: 'Unsubscribed'}
                        ]
                    },
                    {
                        key: 'email_open_rate',
                        label: 'Open rate',
                        type: 'text',
                        icon: <LucideIcon.Percent className="size-4" />
                    },
                    {
                        key: 'email_count',
                        label: 'Emails sent',
                        type: 'text',
                        icon: <LucideIcon.Send className="size-4" />
                    },
                    {
                        key: 'email_opened_count',
                        label: 'Emails opened',
                        type: 'text',
                        icon: <LucideIcon.MailOpen className="size-4" />
                    }
                ]
            }
        ],
        [labelsData, tiersData, offersData]
    );

    const hasFilters = filters.length > 0;

    const handleClearFilters = useCallback(() => {
        onFiltersChange([]);
    }, [onFiltersChange]);

    const className = cn(
        'flex items-center justify-between gap-2',
        !hasFilters && '[grid-area:actions] ',
        hasFilters && 'col-start-1 col-end-4 row-start-3 pt-7 '
    );

    return (
        <div className={className}>
            <div className="relative w-64">
                <LucideIcon.Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                <Input
                    className="pl-9"
                    placeholder="Search members..."
                    value={search}
                    onChange={e => onSearchChange(e.target.value)}
                />
            </div>
            <div className="flex items-center gap-2">
                <Filters
                    addButtonIcon={
                        hasFilters ? (
                            <LucideIcon.FunnelPlus />
                        ) : (
                            <LucideIcon.Funnel />
                        )
                    }
                    addButtonText={hasFilters ? 'Add filter' : 'Filter'}
                    className={`[&>button]:order-last ${
                        hasFilters && '[&>button]:border-none'
                    }`}
                    fields={filterFields}
                    filters={filters}
                    keyboardShortcut="f"
                    popoverAlign={hasFilters ? 'start' : 'end'}
                    onChange={onFiltersChange}
                />
                {hasFilters && (
                    <Button
                        className="font-normal text-muted-foreground"
                        variant="ghost"
                        onClick={handleClearFilters}
                    >
                        <LucideIcon.FunnelX />
                        Clear
                    </Button>
                )}
            </div>
        </div>
    );
};

export default MembersFilters;
