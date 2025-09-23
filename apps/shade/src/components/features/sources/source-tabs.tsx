import {DropdownMenu, DropdownMenuContent, DropdownMenuItem} from '@/components/ui/dropdown-menu';
import {Tabs, TabsDropdownTrigger, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {ChevronDown} from 'lucide-react';
import React from 'react';

export type CampaignType = '' | 'UTM sources' | 'UTM mediums' | 'UTM campaigns' | 'UTM contents' | 'UTM terms';
export type TabType = 'sources' | 'campaigns';

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

interface SourceTabsProps {
    className?: string;
    selectedTab: TabType;
    onTabChange: (tab: TabType) => void;
    selectedCampaign: CampaignType;
    onCampaignChange: (campaign: CampaignType) => void;
}

const SourceTabs: React.FC<SourceTabsProps> = ({
    className,
    selectedTab,
    onTabChange,
    selectedCampaign,
    onCampaignChange
}) => {
    return (
        <Tabs
            className={className}
            defaultValue={'sources'}
            value={selectedTab}
            variant='button-sm'
            onValueChange={(value: string) => {
                const newTab = value as TabType;
                // Only allow switching to campaigns tab if a campaign is selected
                if (newTab === 'campaigns' && !selectedCampaign) {
                    return;
                }
                onTabChange(newTab);
                if (newTab !== 'campaigns') {
                    onCampaignChange('');
                }
            }}
        >
            <TabsList>
                <TabsTrigger value={'sources'}>Sources</TabsTrigger>
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
            </TabsList>
        </Tabs>
    );
};

export default SourceTabs;
