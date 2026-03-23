import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import TiersList from './tiers/tiers-list';
import TopLevelGroup from '../../top-level-group';
import clsx from 'clsx';
import {Button, LimitModal, StripeButton, TabView, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../hooks/use-limiter';
import {type Tier, getActiveTiers, getArchivedTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const StripeConnectedButton: React.FC<{className?: string; onClick: () => void;}> = ({className, onClick}) => {
    className = clsx(
        'border-grey-300 text-grey-900 hover:border-grey-500 dark:border-grey-900 group flex shrink-0 items-center justify-center whitespace-nowrap rounded border px-3 py-1.5 text-sm font-semibold transition-all dark:text-white',
        className
    );
    return (
        <button className={className} data-testid='stripe-connected' type='button' onClick={onClick}>
            <span className="bg-green inline-flex size-2 rounded-full transition-all group-hover:bg-[#625BF6]"></span>
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
    const limiter = useLimiter();

    const openConnectModal = async () => {
        // Allow Stripe despite the limit when it's already connected, so it's
        // possible to disconnect or update the settings.
        if (limiter?.isDisabled('limitStripeConnect') && !checkStripeEnabled(settings, config)) {
            try {
                await limiter.errorIfWouldGoOverLimit('limitStripeConnect');
            } catch (error) {
                if (error instanceof HostLimitError) {
                    NiceModal.show(LimitModal, {
                        prompt: error.message || `Your current plan doesn't support Stripe Connect.`,
                        onOk: () => updateRoute({route: '/pro', isExternal: true})
                    });
                    return;
                }
            }
        }
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
                <StripeConnectedButton className='tablet:!visible tablet:!block hidden' onClick={openConnectModal} />
                :
                <StripeButton className='tablet:!visible tablet:!block hidden' onClick={openConnectModal}/>}
            description='Set prices and paid member sign up settings'
            keywords={keywords}
            navid='tiers'
            testId='tiers'
            title='Tiers'
        >
            <div className='tablet:hidden w-full'>
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
