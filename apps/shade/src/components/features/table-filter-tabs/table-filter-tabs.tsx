import {DropdownMenu, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Tabs, TabsDropdownTrigger, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ChevronDown} from 'lucide-react';
import React, {createContext, useContext} from 'react';

export type CampaignType = '' | 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms';
export type TabType = string;

export const CAMPAIGN_TYPES: readonly CampaignType[] = [
    '',
    'UTM sources',
    'UTM mediums',
    'UTM campaigns',
    'UTM contents',
    'UTM terms'
] as const;

const getCampaignDisplayText = (campaign: CampaignType) => {
    return campaign || 'Campaigns';
};

interface TableFilterTabsContextValue {
    selectedCampaign: CampaignType;
    onCampaignChange: (campaign: CampaignType) => void;
    onTabChange: (tab: TabType) => void;
}

const TableFilterTabsContext = createContext<TableFilterTabsContextValue | undefined>(undefined);

const useTableFilterTabsContext = () => {
    const context = useContext(TableFilterTabsContext);
    if (!context) {
        throw new Error('Tab components must be used within TableFilterTabs');
    }
    return context;
};

interface TableFilterTabProps {
    value: string;
    children?: React.ReactNode;
}

const TableFilterTab: React.FC<TableFilterTabProps> = ({
    value,
    children
}) => {
    return <TabsTrigger value={value}>{children}</TabsTrigger>;
};

const TableFilterCampaignTab: React.FC = () => {
    const {selectedCampaign, onCampaignChange, onTabChange} = useTableFilterTabsContext();

    return (
        <DropdownMenu>
            <TabsDropdownTrigger
                className="flex items-center gap-2"
                value={'campaigns'}
            >
                {getCampaignDisplayText(selectedCampaign)} <ChevronDown className="size-4" />
            </TabsDropdownTrigger>
            <DropdownMenuContent>
                {CAMPAIGN_TYPES.filter(campaign => campaign !== '').map(campaign => (
                    <DropdownMenuItem
                        key={campaign}
                        onClick={() => {
                            onCampaignChange(campaign);
                            onTabChange('campaigns');
                        }}
                    >
                        {campaign}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
};

interface TableFilterTabsProps {
    className?: string;
    selectedTab: TabType;
    onTabChange: (tab: TabType) => void;
    selectedCampaign: CampaignType;
    onCampaignChange: (campaign: CampaignType) => void;
    children?: React.ReactNode;
    defaultValue?: string;
}

const TableFilterTabs: React.FC<TableFilterTabsProps> = ({
    className,
    selectedTab,
    onTabChange,
    selectedCampaign,
    onCampaignChange,
    children,
    defaultValue
}) => {
    const handleTabChange = (value: string) => {
        const newTab = value as TabType;
        // Only allow switching to campaigns tab if a campaign is selected
        if (newTab === 'campaigns' && !selectedCampaign) {
            return;
        }
        onTabChange(newTab);
        if (newTab !== 'campaigns') {
            onCampaignChange('');
        }
    };

    const contextValue: TableFilterTabsContextValue = {
        selectedCampaign,
        onCampaignChange,
        onTabChange
    };

    return (
        <TableFilterTabsContext.Provider value={contextValue}>
            <Tabs
                className={className}
                defaultValue={defaultValue}
                value={selectedTab}
                variant='button-sm'
                onValueChange={handleTabChange}
            >
                <TabsList>
                    {children}
                </TabsList>
            </Tabs>
        </TableFilterTabsContext.Provider>
    );
};

export {
    TableFilterTab,
    TableFilterCampaignTab,
    TableFilterTabs
};
