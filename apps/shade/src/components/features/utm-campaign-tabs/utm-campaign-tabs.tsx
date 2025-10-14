import React from 'react';
import {TableFilterDropdownTab, TableFilterTab, TableFilterTabs} from '../table-filter-tabs/table-filter-tabs';

export type CampaignType = '' | 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms';
export type TabType = 'sources' | 'campaigns';

export const CAMPAIGN_TYPES = [
    'UTM sources',
    'UTM mediums',
    'UTM campaigns',
    'UTM contents',
    'UTM terms'
] as const satisfies readonly Exclude<CampaignType, ''>[];

export const UTM_TYPE_MAP: Record<Exclude<CampaignType, ''>, string> = {
    'UTM sources': 'utm_source',
    'UTM mediums': 'utm_medium',
    'UTM campaigns': 'utm_campaign',
    'UTM contents': 'utm_content',
    'UTM terms': 'utm_term'
};

export const getUtmType = (campaign: CampaignType): string => {
    return campaign ? UTM_TYPE_MAP[campaign as Exclude<CampaignType, ''>] || '' : '';
};

export const CAMPAIGN_OPTIONS = CAMPAIGN_TYPES.map(type => ({
    value: type,
    label: type
}));

interface UtmCampaignTabsProps {
    className?: string;
    selectedTab: TabType;
    onTabChange: (tab: TabType) => void;
    selectedCampaign: CampaignType;
    onCampaignChange: (campaign: CampaignType) => void;
}

export const UtmCampaignTabs: React.FC<UtmCampaignTabsProps> = ({
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
        onTabChange(tab as TabType);

        // Clear campaign when switching away
        if (tab !== 'campaigns') {
            onCampaignChange('');
        }
    };

    const handleCampaignChange = (campaign: string) => {
        onCampaignChange(campaign as CampaignType);
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
                options={CAMPAIGN_OPTIONS}
                placeholder='Campaigns'
                selectedOption={selectedCampaign}
                value='campaigns'
                onOptionChange={handleCampaignChange}
            />
        </TableFilterTabs>
    );
};
