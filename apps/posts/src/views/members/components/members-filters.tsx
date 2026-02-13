import React from 'react';
import {Filter, Filters, LucideIcon} from '@tryghost/shade';
import {useBrowseConfig} from '@tryghost/admin-x-framework/api/config';
import {useBrowseLabels} from '@tryghost/admin-x-framework/api/labels';
import {useBrowseNewsletters} from '@tryghost/admin-x-framework/api/newsletters';
import {useBrowseSettings} from '@tryghost/admin-x-framework/api/settings';
import {useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useMembersFilterConfig} from '../hooks/use-members-filter-config';

interface MembersFiltersProps {
    filters: Filter[];
    onFiltersChange: (filters: Filter[]) => void;
}

const MembersFilters: React.FC<MembersFiltersProps> = ({
    filters,
    onFiltersChange
}) => {
    // Fetch required data for filters
    const {data: labelsData} = useBrowseLabels({});
    const {data: tiersData} = useBrowseTiers({});
    const {data: newslettersData} = useBrowseNewsletters({});
    const {data: settingsData} = useBrowseSettings({});
    const {data: configData} = useBrowseConfig({});

    // Get settings
    const settings = settingsData?.settings || [];
    const paidMembersEnabled = settings.find(s => s.key === 'paid_members_enabled')?.value === true;
    const emailAnalyticsEnabled = configData?.config?.emailAnalytics === true;

    // Get data
    const labels = labelsData?.labels || [];
    const tiers = tiersData?.tiers || [];
    const newsletters = newslettersData?.newsletters || [];
    const activePaidTiers = tiers.filter(t => t.type === 'paid' && t.active);
    const hasMultipleTiers = activePaidTiers.length > 1;

    // Get filter configuration
    const filterFields = useMembersFilterConfig({
        labels,
        tiers: activePaidTiers,
        newsletters: newsletters.filter(n => n.status === 'active'),
        hasMultipleTiers,
        paidMembersEnabled,
        emailAnalyticsEnabled,
        // For now, use static options - can be enhanced with search later
        labelsOptions: labels.map(l => ({value: l.id, label: l.name})),
        tiersOptions: activePaidTiers.map(t => ({value: t.id, label: t.name}))
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
