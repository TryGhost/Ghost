import React from 'react';
import {TableFilterDropdownTab, TableFilterTab, TableFilterTabs} from '../table-filter-tabs/table-filter-tabs';

export type GrowthCampaignType = '' | 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms';
export type GrowthTabType = 'sources' | 'campaigns';

export const GROWTH_CAMPAIGN_TYPES: readonly GrowthCampaignType[] = [
    'UTM sources',
    'UTM mediums',
    'UTM campaigns',
    'UTM contents',
    'UTM terms'
] as const;

const GROWTH_CAMPAIGN_OPTIONS = GROWTH_CAMPAIGN_TYPES.map(type => ({
    value: type,
    label: type
}));

interface UtmGrowthTabsProps {
    className?: string;
    selectedTab: GrowthTabType;
    onTabChange: (tab: GrowthTabType) => void;
    selectedCampaign: GrowthCampaignType;
    onCampaignChange: (campaign: GrowthCampaignType) => void;
}

export const UtmGrowthTabs: React.FC<UtmGrowthTabsProps> = ({
    className,
    selectedTab,
    onTabChange,
    selectedCampaign,
    onCampaignChange
}) => {
    const handleTabChange = (tab: string) => {
        // Prevent switching to campaigns without selection
        if (tab === 'campaigns' && !selectedCampaign) {
            return;
        }
        onTabChange(tab as GrowthTabType);

        // Clear campaign when switching away
        if (tab !== 'campaigns') {
            onCampaignChange('');
        }
    };

    const handleCampaignChange = (campaign: string) => {
        onCampaignChange(campaign as GrowthCampaignType);
        onTabChange('campaigns');
    };

    return (
        <TableFilterTabs
            className={className}
            selectedTab={selectedTab}
            onTabChange={handleTabChange}
        >
            <TableFilterTab value='sources'>Sources</TableFilterTab>
            <TableFilterDropdownTab
                options={GROWTH_CAMPAIGN_OPTIONS}
                placeholder='Campaigns'
                selectedOption={selectedCampaign}
                value='campaigns'
                onOptionChange={handleCampaignChange}
            />
        </TableFilterTabs>
    );
};
