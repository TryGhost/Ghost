import ManageViewPopover from './manage-view-popover';
import React, {useCallback, useMemo} from 'react';
import {Button} from '@tryghost/shade/components';
import {Filter, Filters} from '@tryghost/shade/patterns';
import {LucideIcon, cn} from '@tryghost/shade/utils';
import {
    buildOfferOptions,
    fromOfferFilterDisplayValues,
    toOfferFilterDisplayValues,
    useMemberFilterFields
} from '../use-member-filter-fields';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useEmailPostValueSource} from '@src/hooks/filter-sources/use-email-post-value-source';
import {useLabelValueSource} from '@src/hooks/filter-sources/use-label-value-source';
import {usePostResourceValueSource} from '@src/hooks/filter-sources/use-post-resource-value-source';
import {useTierValueSource} from '@src/hooks/filter-sources/use-tier-value-source';
import type {MemberView} from '../hooks/use-member-views';

interface MembersFiltersProps {
    filters: Filter[];
    nql?: string;
    onFiltersChange: (filters: Filter[]) => void;
    savedViews?: MemberView[];
    activeView?: MemberView | null;
    iconOnly?: boolean;
}

const EMPTY_OFFERS: typeof buildOfferOptions extends (offers: infer T) => unknown ? T : never = [];

function mapOfferRedemptionFilters(
    filters: Filter[],
    mapValues: (values: string[]) => string[]
) {
    return filters.map((filter) => {
        if (filter.field !== 'offer_redemptions') {
            return filter;
        }

        return {
            ...filter,
            values: mapValues(filter.values as string[])
        };
    });
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
    filters,
    nql,
    onFiltersChange,
    savedViews = [],
    activeView,
    iconOnly = false
}) => {
    const {data: tiersData} = useBrowseTiers({searchParams: {limit: '100'}});
    const {data: offersData} = useBrowseOffers({});
    const {data: newslettersData} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: settingsData} = useBrowseSettings({});
    const {data: configData} = useBrowseConfig();

    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailFiltersEnabled = getSettingValue<string>(settings, 'editor_default_email_recipients') !== 'disabled';
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const siteTimezone = getSiteTimezone(settings);
    const giftSubscriptionsEnabled = configData?.config?.labs?.giftSubscriptions === true;

    const tiers = tiersData?.tiers || [];
    const newsletters = newslettersData?.newsletters || [];
    const offers = useMemo(() => offersData?.offers ?? EMPTY_OFFERS, [offersData?.offers]);
    const activePaidTiers = tiers.filter(tier => tier.type === 'paid' && tier.active);
    const hasMultipleTiers = activePaidTiers.length > 1;

    const offersOptions = useMemo(() => {
        return buildOfferOptions(offers);
    }, [offers]);
    const hydratedNewsletterSlugs = useMemo(() => {
        return [...new Set(
            filters
                .map(filter => filter.field)
                .filter(field => field.startsWith('newsletters.'))
                .map(field => field.slice('newsletters.'.length))
                .filter(Boolean)
        )];
    }, [filters]);

    const displayFilters = useMemo(() => {
        return mapOfferRedemptionFilters(filters, values => toOfferFilterDisplayValues(values, offersOptions));
    }, [filters, offersOptions]);

    const handleFiltersChange = useCallback((newFilters: Filter[]) => {
        onFiltersChange(mapOfferRedemptionFilters(newFilters, values => fromOfferFilterDisplayValues(values, offersOptions)));
    }, [onFiltersChange, offersOptions]);

    const postValueSource = usePostResourceValueSource();
    const emailValueSource = useEmailPostValueSource();
    const labelValueSource = useLabelValueSource();
    const tierValueSource = useTierValueSource(activePaidTiers.map(tier => ({value: tier.id, label: tier.name, detail: tier.slug})));

    const filterFields = useMemberFilterFields({
        newsletters,
        hydratedNewsletterSlugs,
        hasMultipleTiers,
        paidMembersEnabled,
        emailFiltersEnabled,
        labelValueSource,
        tierValueSource,
        offers,
        postValueSource,
        emailValueSource,
        membersTrackSources,
        emailTrackOpens,
        emailTrackClicks,
        siteTimezone,
        giftSubscriptionsEnabled
    });

    const hasFilters = filters.length > 0;
    const showIconOnlyTrigger = iconOnly && !hasFilters;
    const addFilterButtonClassName = cn(
        'border-input bg-white dark:bg-background',
        showIconOnlyTrigger && 'min-w-[34px] gap-0 px-2 text-[0px] lg:min-w-0 lg:gap-1.5 lg:px-3 lg:text-sm !px-3'
    );

    const clearAndSaveButtons = hasFilters ? (
        <div className="flex shrink-0 items-center gap-4 sm:absolute sm:top-0 sm:right-0">
            <Button
                className="hidden items-center gap-1 !px-0 text-sm font-normal text-muted-foreground hover:bg-transparent hover:text-foreground lg:inline-flex"
                type="button"
                variant="ghost"
                onClick={() => onFiltersChange([])}
            >
                <LucideIcon.X className="size-4" />
                Clear
            </Button>
            {nql && (
                <ManageViewPopover
                    activeView={activeView}
                    existingViews={savedViews}
                    filter={nql}
                    onDeleted={() => onFiltersChange([])}
                />
            )}
        </div>
    ) : undefined;

    return (
        <Filters
            addButtonClassName={addFilterButtonClassName}
            addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
            addButtonText={hasFilters ? 'Add filter' : 'Filter'}
            allowMultiple={true}
            className={`[&>button]:order-last ${hasFilters ? 'sm:!pr-40 [&>button]:border-none' : 'w-auto'}`}
            clearButton={clearAndSaveButtons}
            fields={filterFields}
            filters={displayFilters}
            keyboardShortcut="f"
            popoverAlign={'start'}
            popoverContentClassName='z-[80] w-[280px] [&_[data-slot=command-list]]:max-h-[450px]'
            showClearButton={hasFilters}
            showSearchInput={true}
            onChange={handleFiltersChange}
        />
    );
};

export default MembersFilters;
