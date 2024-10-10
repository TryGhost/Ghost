import React, {useState} from 'react';
import TiersList from './tiers/TiersList';
import TopLevelGroup from '../../TopLevelGroup';
import clsx from 'clsx';
import {Button, StripeButton, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {Tier, getActiveTiers, getArchivedTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const StripeConnectedButton: React.FC<{className?: string; onClick: () => void;}> = ({className, onClick}) => {
    className = clsx(
        'group flex shrink-0 items-center justify-center whitespace-nowrap rounded border border-grey-300 px-3 py-1.5 text-sm font-semibold text-grey-900 transition-all hover:border-grey-500 dark:border-grey-900 dark:text-white',
        className
    );
    return (
        <button className={className} data-testid='stripe-connected' type='button' onClick={onClick}>
            <span className="inline-flex h-2 w-2 rounded-full bg-green transition-all group-hover:bg-[#625BF6]"></span>
            <span className='ml-2'>Connected to Stripe</span>
        </button>
    );
};

const Tiers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const [selectedTab, setSelectedTab] = useState('active-tiers');
    const {settings, config} = useGlobalData();
    const {data: {tiers, meta, isEnd} = {}, fetchNextPage} = useBrowseTiers();
    const activeTiers = getActiveTiers(tiers || []);
    const archivedTiers = getArchivedTiers(tiers || []);
    const {updateRoute} = useRouting();

    const openConnectModal = () => {
        updateRoute('stripe-connect');
    };

    const sortTiers = (t: Tier[]) => {
        return [...t].sort((a, b) => (a.monthly_price ?? 0) - (b.monthly_price ?? 0));
    };

    const tabs = [
        {
            id: 'active-tiers',
            title: 'Active',
            contents: (<TiersList tab='active-tiers' tiers={sortTiers(activeTiers)} />)
        },
        {
            id: 'archived-tiers',
            title: 'Archived',
            contents: (<TiersList tab='archive-tiers' tiers={sortTiers(archivedTiers)} />)
        }
    ];

    let content;
    if (checkStripeEnabled(settings, config)) {
        content = <TabView selectedTab={selectedTab} tabs={tabs} onTabChange={setSelectedTab} />;
    } else {
        content = <TiersList tab='free-tier' tiers={activeTiers.filter(tier => tier.type === 'free')} />;
    }

    return (
        <TopLevelGroup
            customButtons={checkStripeEnabled(settings, config) ?
                <StripeConnectedButton className='hidden tablet:!visible tablet:!block' onClick={openConnectModal} />
                :
                <StripeButton className='hidden tablet:!visible tablet:!block' onClick={openConnectModal}/>}
            description='Set prices and paid member sign up settings'
            keywords={keywords}
            navid='tiers'
            testId='tiers'
            title='Tiers'
        >
            <div className='w-full tablet:hidden'>
                {checkStripeEnabled(settings, config) ?
                    <StripeConnectedButton className='w-full' onClick={openConnectModal} />
                    :
                    <StripeButton onClick={openConnectModal}/>
                }
            </div>

            {content}
            {isEnd === false && <Button
                label={`Load more (showing ${tiers?.length || 0}/${meta?.pagination.total || 0} tiers)`}
                link
                onClick={() => fetchNextPage()}
            />}
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Tiers, 'Tiers');
