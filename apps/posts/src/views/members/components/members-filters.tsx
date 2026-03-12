import React, {useCallback, useMemo} from 'react';
import {Filter, Filters, LucideIcon} from '@tryghost/shade';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useResourceSearch} from '../hooks/use-resource-search';
import {
    buildOfferOptions,
    buildRetentionOfferIdMap,
    collapseRetentionOfferFilters,
    expandRetentionOfferFilters,
    useMemberFilterFields
} from '../use-member-filter-fields';

interface MembersFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
    filters,
    onFiltersChange
}) => {
    const {data: labelsData} = useBrowseLabels({searchParams: {limit: '100'}});
    const {data: tiersData} = useBrowseTiers({searchParams: {limit: '100'}});
    const {data: offersData} = useBrowseOffers({});
    const {data: newslettersData} = useBrowseNewsletters({searchParams: {limit: '100'}});
    const {data: settingsData} = useBrowseSettings({});
    const {data: configData} = useBrowseConfig({});

    const settings = settingsData?.settings || [];
    const paidMembersEnabled = getSettingValue<boolean>(settings, 'paid_members_enabled') === true;
    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;
    const membersTrackSources = getSettingValue<boolean>(settings, 'members_track_sources') === true;
    const emailTrackOpens = getSettingValue<boolean>(settings, 'email_track_opens') === true;
    const emailTrackClicks = getSettingValue<boolean>(settings, 'email_track_clicks') === true;
    const audienceFeedbackEnabled = configData?.config?.labs?.audienceFeedback === true;
    const retentionOffersEnabled = configData?.config?.labs?.retentionOffers === true;
    const siteTimezone = getSiteTimezone(settings);

    const labels = labelsData?.labels || [];
    const tiers = tiersData?.tiers || [];
    const newsletters = newslettersData?.newsletters || [];
    const offers = offersData?.offers || [];
    const activePaidTiers = tiers.filter(tier => tier.type === 'paid' && tier.active);
    const hasMultipleTiers = activePaidTiers.length > 1;

    const retentionMap = useMemo(() => {
        return retentionOffersEnabled ? buildRetentionOfferIdMap(offers) : new Map<string, string[]>();
    }, [offers, retentionOffersEnabled]);

    const offersOptions = useMemo(() => {
        return buildOfferOptions(offers, retentionOffersEnabled, retentionMap);
    }, [offers, retentionOffersEnabled, retentionMap]);

    const displayFilters = useMemo(() => {
        return collapseRetentionOfferFilters(filters, retentionMap);
    }, [filters, retentionMap]);

    const handleFiltersChange = useCallback((newFilters: Filter[]) => {
        onFiltersChange(expandRetentionOfferFilters(newFilters, retentionMap));
    }, [onFiltersChange, retentionMap]);

    const postSearch = useResourceSearch('post');
    const emailSearch = useResourceSearch('email');

    const filterFields = useMemberFilterFields({
        newsletters: newsletters.filter(newsletter => newsletter.status === 'active'),
        hasMultipleTiers,
        paidMembersEnabled,
        emailAnalyticsEnabled,
        labelsOptions: labels.map(label => ({value: label.slug, label: label.name})),
        tiersOptions: activePaidTiers.map(tier => ({value: tier.id, label: tier.name})),
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
