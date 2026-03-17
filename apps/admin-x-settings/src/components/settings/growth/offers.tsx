import React from 'react';
import TopLevelGroup from '../../top-level-group';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useGlobalData} from '../../providers/global-data-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

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
            customButtons={<Button className='mt-[-5px]' color='clear' disabled={!checkStripeEnabled(settings, config)} label='Manage offers' size='sm' onClick={openOfferListModal}/>}
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
                    <Button className='font-normal' color='green' label='Manage tiers' link linkWithPadding onClick={openTiers} />
                </div>
                ) : ''
            }
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Offers, 'Portal settings');
