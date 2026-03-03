import React, {useCallback, useMemo} from 'react';
import {Filter, FilterOption, Filters, LucideIcon} from '@tryghost/shade';
import {Offer} from '@tryghost/admin-x-framework/api/offers';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMembersFilterConfig} from '../hooks/use-members-filter-config';
import {useResourceSearch} from '../hooks/use-resource-search';

/**
 * Build a map of synthetic retention IDs to their underlying real offer IDs.
 * e.g. 'retention:month' -> ['offer-id-1', 'offer-id-2']
 */
function buildRetentionOfferIdMap(offers: Offer[]): Map<string, string[]> {
    const map = new Map<string, string[]>();
    const monthlyIds: string[] = [];
    const yearlyIds: string[] = [];

    for (const offer of offers) {
        if (offer.redemption_type === 'retention') {
            if (offer.cadence === 'month') {
                monthlyIds.push(offer.id);
            } else if (offer.cadence === 'year') {
                yearlyIds.push(offer.id);
            }
        }
    }

    if (monthlyIds.length > 0) {
        map.set('retention:month', monthlyIds);
    }
    if (yearlyIds.length > 0) {
        map.set('retention:year', yearlyIds);
    }

    return map;
}

/**
 * Build offer filter options, grouping retention offers into
 * "Monthly Retention" / "Yearly Retention" when the labs flag is enabled.
 */
function buildOfferOptions(offers: Offer[], retentionOffersEnabled: boolean, retentionMap: Map<string, string[]>): FilterOption[] {
    const options: FilterOption[] = [];

    for (const offer of offers) {
        if (retentionOffersEnabled && offer.redemption_type === 'retention') {
            continue;
        }
        options.push({value: offer.id, label: offer.name});
    }

    if (retentionOffersEnabled) {
        if (retentionMap.has('retention:month')) {
            options.push({value: 'retention:month', label: 'Monthly Retention'});
        }
        if (retentionMap.has('retention:year')) {
            options.push({value: 'retention:year', label: 'Yearly Retention'});
        }
    }

    return options;
}

interface MembersFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
    filters,
    onFiltersChange
}) => {
    // Fetch required data for filters
    const {data: labelsData} = useBrowseLabels({searchParams: {limit: '100'}});
    const {data: tiersData} = useBrowseTiers({searchParams: {limit: '100'}});
    const {data: offersData} = useBrowseOffers({});
    const {data: newslettersData} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: settingsData} = useBrowseSettings({});
    const {data: configData} = useBrowseConfig({});

    // Get settings
    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const audienceFeedbackEnabled = configData?.config?.labs?.audienceFeedback === true;
    const retentionOffersEnabled = configData?.config?.labs?.retentionOffers === true;
    const siteTimezone = getSiteTimezone(settings);

    // Get data
    const labels = labelsData?.labels || [];
    const tiers = tiersData?.tiers || [];
    const newsletters = newslettersData?.newsletters || [];
    const offers = offersData?.offers || [];
    const activePaidTiers = tiers.filter(t => t.type === 'paid' && t.active);
    const hasMultipleTiers = activePaidTiers.length > 1;

    // Build offer options with retention grouping
    const retentionMap = useMemo(() => {
        return retentionOffersEnabled ? buildRetentionOfferIdMap(offers) : new Map<string, string[]>();
    }, [offers, retentionOffersEnabled]);

    const offersOptions = useMemo(() => {
        return buildOfferOptions(offers, retentionOffersEnabled, retentionMap);
    }, [offers, retentionOffersEnabled, retentionMap]);

    // When retention grouping is active, translate between synthetic IDs (for display)
    // and real offer IDs (stored in URL / sent to API)
    const displayFilters = useMemo(() => {
        if (retentionMap.size === 0) {
            return filters;
        }
        return filters.map((filter) => {
            if (filter.field !== 'offer_redemptions') {
                return filter;
            }
            const values = [...filter.values as string[]];
            const collapsed: string[] = [];
            const consumed = new Set<string>();

            // Collapse real IDs into synthetic IDs where all IDs in the group are present
            for (const [syntheticId, realIds] of retentionMap) {
                if (realIds.length > 0 && realIds.every(id => values.includes(id))) {
                    collapsed.push(syntheticId);
                    realIds.forEach(id => consumed.add(id));
                }
            }

            // Keep any remaining real IDs that weren't part of a complete group
            for (const v of values) {
                if (!consumed.has(v)) {
                    collapsed.push(v);
                }
            }

            return {...filter, values: collapsed};
        });
    }, [filters, retentionMap]);

    const handleFiltersChange = useCallback((newFilters: Filter[]) => {
        if (retentionMap.size === 0) {
            onFiltersChange(newFilters);
            return;
        }
        const expanded = newFilters.map((filter) => {
            if (filter.field !== 'offer_redemptions') {
                return filter;
            }
            const values: string[] = [];
            for (const value of filter.values as string[]) {
                const realIds = retentionMap.get(value as string);
                if (realIds) {
                    values.push(...realIds);
                } else {
                    values.push(value as string);
                }
            }
            return {...filter, values: [...new Set(values)]};
        });
        onFiltersChange(expanded);
    }, [onFiltersChange, retentionMap]);

    // Resource search hooks for post/page and email pickers
    const postSearch = useResourceSearch('post');
    const emailSearch = useResourceSearch('email');

    // Get filter configuration
    const filterFields = useMembersFilterConfig({
        labels,
        tiers: activePaidTiers,
        newsletters: newsletters.filter(n => n.status === 'active'),
        hasMultipleTiers,
        paidMembersEnabled,
        emailAnalyticsEnabled,
        labelsOptions: labels.map(l => ({value: l.slug, label: l.name})),
        tiersOptions: activePaidTiers.map(t => ({value: t.id, label: t.name})),
        offersOptions,
        hasOffers: offers.length > 0,
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
            addButtonIcon={
                hasFilters ? (
                    <LucideIcon.FunnelPlus />
                ) : (
                    <LucideIcon.Funnel />
                )
            }
            addButtonText={hasFilters ? 'Add filter' : 'Filter'}
            allowMultiple={true}
            className={`[&>button]:order-last ${
                hasFilters ? '[&>button]:border-none' : 'w-auto'
            }`}
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
