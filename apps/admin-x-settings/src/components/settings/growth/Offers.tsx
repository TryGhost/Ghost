import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {CopyLinkButton, createRedemptionFilterUrl, getOfferDiscount} from './offers/OffersIndex';
import {Offer, useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {Tier, getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {numberWithCommas} from '../../../utils/helpers';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const OfferContainer: React.FC<{offerTitle: string, tier: Tier, cadence: string, redemptions: number, type: string, amount: number, currency: string, offerId: string, offerCode: string, goToOfferEdit: (offerId: string) => void}> = (
    {offerTitle, tier, cadence, redemptions, type, amount, currency, offerId, offerCode, goToOfferEdit}) => {
    const {discountOffer} = getOfferDiscount(type, amount, cadence, currency || 'USD', tier);
    return <div className='group flex h-full cursor-pointer flex-col justify-between gap-4 break-words rounded-sm border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800 min-[900px]:min-h-[187px]' onClick={() => goToOfferEdit(offerId)}>
        <span className='text-[1.65rem] font-bold leading-tight tracking-tight text-black dark:text-white'>{offerTitle}</span>
        <div className='flex flex-col'>
            <span className={`text-sm font-semibold uppercase`}>{discountOffer}</span>
            <div className='flex gap-1 text-xs'>
                <span className='font-semibold'>{tier.name}</span>
                <span className='text-grey-700'>{cadence === 'month' ? 'monthly' : 'yearly'}</span>
            </div>
            <div className='mt-2 flex items-end justify-between'>
                <a className={`text-xs text-grey-700 hover:text-black ${redemptions === 0 ? 'pointer-events-none' : 'hover:underline'}`} data-test-offer={offerTitle} href={createRedemptionFilterUrl(offerId)}>{numberWithCommas(redemptions)} {redemptions === 1 ? 'redemption' : 'redemptions'}</a>
                <CopyLinkButton offerCode={offerCode} />
            </div>
        </div>
    </div>;
};

const Offers: React.FC<{ keywords: string[] }> = ({keywords}) => {
    const {updateRoute} = useRouting();
    const {settings, config} = useGlobalData();

    const {data: {offers: allOffers = []} = {}} = useBrowseOffers();

    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    const activeOffers = allOffers
        .map(offer => ({...offer, tier: paidActiveTiers.find(tier => tier.id === offer.tier.id)}))
        .filter((offer): offer is Offer & {tier: Tier} => offer.status === 'active' && !!offer.tier);

    activeOffers.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    const latestThree = activeOffers.slice(0, 3);

    const openOfferListModal = () => {
        updateRoute('offers/edit');
    };

    const openAddModal = () => {
        updateRoute('offers/new');
    };

    const openTiers = () => {
        updateRoute('/tiers');
    };

    const goToOfferEdit = (offerId: string) => {
        sessionStorage.setItem('editOfferPageSource', 'offers');
        updateRoute(`offers/edit/${offerId}`);
    };

    let offerButtonText = 'Manage offers';
    let offerButtonLink = openOfferListModal;
    let descriptionButtonText = 'Learn more';
    if (allOffers.length > 0) {
        offerButtonText = 'Manage offers';
        offerButtonLink = openOfferListModal;
    } else if (paidActiveTiers.length === 0 && allOffers.length === 0) {
        offerButtonText = '';
        offerButtonLink = openTiers;
        descriptionButtonText = '';
    } else if (paidActiveTiers.length > 0 && allOffers.length === 0) {
        offerButtonText = 'Add offer';
        offerButtonLink = openAddModal;
    }

    return (
        <TopLevelGroup
            customButtons={<Button className='mt-[-5px]' color='clear' disabled={!checkStripeEnabled(settings, config)} label={offerButtonText} size='sm' onClick={offerButtonLink}/>}
            description={<>Create discounts & coupons to boost new subscriptions. {allOffers.length === 0 && <><a className='text-green' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">{descriptionButtonText}</a></>}</>}
            keywords={keywords}
            navid='offers'
            testId='offers'
            title='Offers'
        >
            {latestThree.length > 0 ?
                <div>
                    <div className='grid grid-cols-1 gap-4 min-[900px]:grid-cols-3'>
                        {latestThree.map(offer => (<OfferContainer
                            key={offer.id}
                            amount={offer.amount}
                            cadence={offer.cadence}
                            currency={offer.currency || 'USD'}
                            goToOfferEdit={goToOfferEdit}
                            offerCode={offer.code}
                            offerId={offer.id}
                            offerTitle={offer.name}
                            redemptions={offer.redemption_count}
                            tier={offer.tier}
                            type={offer.type}
                        />))}
                    </div>
                    {allOffers.length > 3 && <div className='mt-4 border-t border-t-grey-200 pt-2'>
                        <span className='text-xs text-grey-700 dark:text-grey-600'>{allOffers.length} offers in total</span>
                    </div>}
                </div> :
                null
            }
            {paidActiveTiers.length === 0 && allOffers.length === 0 ?
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
