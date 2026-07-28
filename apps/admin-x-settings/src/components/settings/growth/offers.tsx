import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button} from '@tryghost/shade/components';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {withErrorBoundary} from '../../error-boundary';

const Offers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, config} = useGlobalData();

    const {data: {offers: allOffers = []} = {}} = useBrowseOffers();

    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    const signupOffers = allOffers.filter(offer => offer.redemption_type === 'signup');

    const openOfferListModal = () => {
        updateRoute('offers/edit');
    };

    const openTiers = () => {
        updateRoute('/tiers');
    };

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' disabled={!checkStripeEnabled(settings, config)} size='sm' type='button' variant='ghost' onClick={openOfferListModal}>Manage offers</Button>}
            description={<>Create discounts & coupons to boost new subscriptions and retain existing members.<span>{' '}</span><a className='text-green' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">Learn more</a></>}
            keywords={keywords}
            navid='offers'
            testId='offers'
            title='Offers'
        >
            {paidActiveTiers.length === 0 && signupOffers.length === 0 ?
                (<div>
                    <span>You must have an active tier to create an offer.</span>
                    {` `}
                    <Button className='h-auto p-1 font-normal' type='button' variant='link' onClick={openTiers}>Manage tiers</Button>
                </div>
                ) : ''
            }
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Offers, 'Portal settings');
