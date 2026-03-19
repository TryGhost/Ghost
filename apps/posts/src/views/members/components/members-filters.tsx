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
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseInfiniteLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useFilterSearch} from '../hooks/use-filter-search';
import {useResourceSearch} from '../hooks/use-resource-search';

interface MembersFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
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
    onFiltersChange
}) => {
    const {data: offersData} = useBrowseOffers({});
    const {data: newslettersData} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: settingsData} = useBrowseSettings({});
    const {data: configData} = useBrowseConfig({});

    const labelSearch = useFilterSearch({
        useQuery: useBrowseInfiniteLabels,
        extractItems: useCallback(
            (data: {labels: Array<{slug: string; name: string}>}) => data.labels.map(l => ({value: l.slug, label: l.name})), []),
        buildSearchFilter: useCallback((term: string) => `name:~'${term}'`, []),
        limit: '100'
    });

    const tierSearch = useFilterSearch({
        useQuery: useBrowseTiers,
        extractItems: useCallback(
            (data: {tiers: Array<{id: string; name: string; type: string; active: boolean}>}) => data.tiers.filter(t => t.type === 'paid' && t.active).map(t => ({value: t.id, label: t.name})), []),
        buildSearchFilter: useCallback((term: string) => `name:~'${term}'`, []),
        limit: '100'
    });

    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const audienceFeedbackEnabled = configData?.config?.labs?.audienceFeedback === true;
    const siteTimezone = getSiteTimezone(settings);

    const newsletters = newslettersData?.newsletters || [];
    const offers = useMemo(() => offersData?.offers ?? EMPTY_OFFERS, [offersData?.offers]);
    const hasMultipleTiers = tierSearch.options.length > 1;

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
        emailAnalyticsEnabled,
        labelsOptions: labelSearch.options,
        labelSearchProps: {
            onSearchChange: labelSearch.onSearchChange,
            searchValue: labelSearch.searchValue,
            isLoading: labelSearch.isLoading,
            onLoadMore: labelSearch.onLoadMore,
            hasMore: labelSearch.hasMore,
            isLoadingMore: labelSearch.isLoadingMore
        },
        tiersOptions: tierSearch.options,
        tierSearchProps: {
            onSearchChange: tierSearch.onSearchChange,
            searchValue: tierSearch.searchValue,
            isLoading: tierSearch.isLoading,
            onLoadMore: tierSearch.onLoadMore,
            hasMore: tierSearch.hasMore,
            isLoadingMore: tierSearch.isLoadingMore
        },
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
        audienceFeedbackEnabled,
        siteTimezone
    });

    const hasFilters = filters.length > 0;

    return (
        <Filters
            addButtonIcon={hasFilters ? <LucideIcon.FunnelPlus /> : <LucideIcon.Funnel />}
            addButtonText={hasFilters ? 'Add filter' : 'Filter'}
            allowMultiple={true}
            className={`[&>button]:order-last ${hasFilters ? '[&>button]:border-none' : 'w-auto'}`}
            clearButtonClassName="font-normal text-muted-foreground"
            clearButtonIcon={<LucideIcon.X />}
            clearButtonText="Clear"
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
