import NiceModal from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import StripeButton from '../../stripe-button';
import TiersList from './tiers/tiers-list';
import TopLevelGroup from '../../top-level-group';
import clsx from 'clsx';
import {Button, LimitModal} from '@tryghost/admin-x-design-system';
import {HostLimitError, useLimiter} from '../../../hooks/use-limiter';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@tryghost/shade/components';
import {type Tier, getActiveTiers, getArchivedTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const StripeConnectedButton: React.FC<{className?: string; onClick: () => void;}> = ({className, onClick}) => {
    className = clsx(
        'group flex shrink-0 items-center justify-center rounded border border-grey-300 px-3 py-1.5 font-semibold whitespace-nowrap text-grey-900 transition-all hover:border-grey-500 dark:border-grey-900 dark:text-white',
        className
    );
    return (
        <button className={className} data-testid='stripe-connected' type='button' onClick={onClick}>
            <span className="inline-flex size-2 rounded-full bg-green transition-all group-hover:bg-[#625BF6]"></span>
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

    let content;
    if (checkStripeEnabled(settings, config)) {
        content = (
            <Tabs value={selectedTab} variant='underline' onValueChange={setSelectedTab}>
                <TabsList>
                    <TabsTrigger value='active-tiers'>Active</TabsTrigger>
                    <TabsTrigger value='archived-tiers'>Archived</TabsTrigger>
                </TabsList>
                <TabsContent value='active-tiers'><TiersList tab='active-tiers' tiers={sortTiers(activeTiers)} /></TabsContent>
                <TabsContent value='archived-tiers'><TiersList tab='archive-tiers' tiers={sortTiers(archivedTiers)} /></TabsContent>
            </Tabs>
        );
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
