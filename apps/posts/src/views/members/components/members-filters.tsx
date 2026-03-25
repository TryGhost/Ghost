import ManageViewPopover from './manage-view-popover';
import React, {useCallback, useMemo} from 'react';
import {Filter, Filters, LucideIcon} from '@tryghost/shade';
import {
    buildOfferOptions,
    fromOfferFilterDisplayValues,
    toOfferFilterDisplayValues,
    useMemberFilterFields
} from '../use-member-filter-fields';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useResourceSearch} from '../hooks/use-resource-search';
import type {MemberView} from '../hooks/use-member-views';

interface MembersFiltersProps {
    filters: Filter[];
    nql?: string;
    onFiltersChange: (filters: Filter[]) => void;
    savedViews?: MemberView[];
    activeView?: MemberView | null;
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
    activeView
}) => {
    const {data: labelsData} = useBrowseLabels({searchParams: {limit: '100'}});
    const {data: tiersData} = useBrowseTiers({searchParams: {limit: '100'}});
    const {data: offersData} = useBrowseOffers({});
    const {data: newslettersData} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: settingsData} = useBrowseSettings({});

    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailFiltersEnabled = getSettingValue<string>(settings, 'editor_default_email_recipients') !== 'disabled';
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const siteTimezone = getSiteTimezone(settings);

    const labels = labelsData?.labels || [];
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

    const postSearch = useResourceSearch('post');
    const emailSearch = useResourceSearch('email');

    const filterFields = useMemberFilterFields({
        newsletters,
        hydratedNewsletterSlugs,
        hasMultipleTiers,
        paidMembersEnabled,
        emailFiltersEnabled,
        labelsOptions: labels.map(label => ({value: label.slug, label: label.name})),
        tiersOptions: activePaidTiers.map(tier => ({value: tier.id, label: tier.name})),
        offers,
        postResourceOptions: postSearch.options,
        onPostResourceSearchChange: postSearch.onSearchChange,
        postResourceSearchValue: postSearch.searchValue,
        postResourceLoading: postSearch.isLoading,
        emailResourceOptions: emailSearch.options,
        onEmailResourceSearchChange: emailSearch.onSearchChange,
        emailResourceSearchValue: emailSearch.searchValue,
        emailResourceLoading: emailSearch.isLoading,
        membersTrackSources,
        emailTrackOpens,
        emailTrackClicks,
        siteTimezone
    });

    const hasFilters = filters.length > 0;
    const clearAndSaveButtons = hasFilters ? (
        <div className="flex shrink-0 items-center gap-2 sm:absolute sm:top-0 sm:right-0">
            <button
                className="flex items-center gap-1 text-sm font-normal text-muted-foreground hover:text-foreground"
                type="button"
                onClick={() => onFiltersChange([])}
            >
                <LucideIcon.X className="size-4" />
                Clear
            </button>
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
            addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
            addButtonText={hasFilters ? 'Add filter' : 'Filter'}
            allowMultiple={true}
            className={`[&>button]:order-last ${hasFilters ? 'sm:!pr-40 [&>button]:border-none' : 'w-auto'}`}
            clearButton={clearAndSaveButtons}
            fields={filterFields}
            filters={displayFilters}
            keyboardShortcut="f"
            popoverAlign={hasFilters ? 'start' : 'end'}
            showClearButton={hasFilters}
            showSearchInput={false}
            onChange={handleFiltersChange}
        />
    );
};

export default MembersFilters;
