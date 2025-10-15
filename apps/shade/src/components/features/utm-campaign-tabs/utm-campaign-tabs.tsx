import React from 'react';
import {TableFilterDropdownTab, TableFilterTab, TableFilterTabs} from '../table-filter-tabs/table-filter-tabs';

// Types
export type UtmCampaignType = '' | 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms';
export type UtmTabType = 'sources' | 'campaigns';

// Constants
export const UTM_CAMPAIGN_TYPES = [
    'UTM sources',
    'UTM mediums',
    'UTM campaigns',
    'UTM contents',
    'UTM terms'
] as const satisfies readonly Exclude<UtmCampaignType, ''>[];

export const UTM_CAMPAIGN_OPTIONS = UTM_CAMPAIGN_TYPES.map(type => ({
    value: type,
    label: type
}));

// Utilities
export const UTM_TYPE_MAP: Record<Exclude<UtmCampaignType, ''>, string> = {
    'UTM sources': 'utm_source',
    'UTM mediums': 'utm_medium',
    'UTM campaigns': 'utm_campaign',
    'UTM contents': 'utm_content',
    'UTM terms': 'utm_term'
};

export const getUtmType = (campaign: UtmCampaignType): string => {
    return campaign ? UTM_TYPE_MAP[campaign as Exclude<UtmCampaignType, ''>] || '' : '';
};

// Component Interfaces
interface UtmCampaignDropdownProps {
    selectedCampaign: UtmCampaignType;
    onCampaignChange: (campaign: UtmCampaignType) => void;
    placeholder?: string;
}

interface UtmCampaignTabsProps {
    className?: string;
    selectedTab: UtmTabType;
    onTabChange: (tab: UtmTabType) => void;
    selectedCampaign: UtmCampaignType;
    onCampaignChange: (campaign: UtmCampaignType) => void;
}

/**
 * Dropdown component for selecting UTM campaign types.
 * Can be embedded within other tab systems.
 */
export const UtmCampaignDropdown: React.FC<UtmCampaignDropdownProps> = ({
    selectedCampaign,
    onCampaignChange,
    placeholder = 'Campaigns'
}) => {
    const handleCampaignChange = (campaign: string) => {
        onCampaignChange(campaign as UtmCampaignType);
    };

    return (
        <TableFilterDropdownTab
            options={UTM_CAMPAIGN_OPTIONS}
            placeholder={placeholder}
            selectedOption={selectedCampaign}
            value='campaigns'
            onOptionChange={handleCampaignChange}
        />
    );
};

/**
 * Complete tab system with Sources and Campaigns (dropdown) tabs.
 * Handles tab switching logic automatically.
 */
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
        onTabChange(tab as UtmTabType);

        // Clear campaign when switching away
        if (tab !== 'campaigns') {
            onCampaignChange('');
        }
    };

    const handleCampaignChange = (campaign: string) => {
        onCampaignChange(campaign as UtmCampaignType);
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
                options={UTM_CAMPAIGN_OPTIONS}
                placeholder='Campaigns'
                selectedOption={selectedCampaign}
                value='campaigns'
                onOptionChange={handleCampaignChange}
            />
        </TableFilterTabs>
    );
};
