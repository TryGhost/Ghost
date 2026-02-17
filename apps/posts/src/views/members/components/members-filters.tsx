import React from 'react';
import {Filter, Filters, LucideIcon} from '@tryghost/shade';
import {getSettingValue, useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {getSiteTimezone} from '@src/utils/get-site-timezone';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMembersFilterConfig} from '../hooks/use-members-filter-config';
import {useResourceSearch} from '../hooks/use-resource-search';

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
    const siteTimezone = getSiteTimezone(settings);

    // Get data
    const labels = labelsData?.labels || [];
    const tiers = tiersData?.tiers || [];
    const newsletters = newslettersData?.newsletters || [];
    const activePaidTiers = tiers.filter(t => t.type === 'paid' && t.active);
    const hasMultipleTiers = activePaidTiers.length > 1;

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
            filters={filters}
            keyboardShortcut="f"
            popoverAlign={hasFilters ? 'start' : 'end'}
            showClearButton={hasFilters}
            showSearchInput={false}
            onChange={onFiltersChange}
        />
    );
};

export default MembersFilters;
