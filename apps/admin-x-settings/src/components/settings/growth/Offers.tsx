import React from 'react';
import TopLevelGroup from '../../TopLevelGroup';
import {Button, withErrorBoundary} from '@tryghost/admin-x-design-system';
import {CopyLinkButton} from './offers/OffersIndex';
import {Tier, getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {checkStripeEnabled} from '@tryghost/admin-x-framework/api/settings';
import {createRedemptionFilterUrl, getOfferDiscount} from './offers/OffersIndex';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useGlobalData} from '../../providers/GlobalDataProvider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const OfferContainer: React.FC<{offerTitle: string, tier: Tier, cadence: string, redemptions: number, type: string, amount: number, currency: string, offerId: string, offerCode: string, goToOfferEdit: (offerId: string) => void}> = (
    {offerTitle, tier, cadence, redemptions, type, amount, currency, offerId, offerCode, goToOfferEdit}) => {
    const {discountColor, discountOffer} = getOfferDiscount(type, amount, cadence, currency || 'USD', tier);
    return <div className='group flex aspect-square cursor-pointer flex-col justify-between break-words rounded-sm border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800' onClick={() => goToOfferEdit(offerId)}>
        <span className='text-[1.65rem] font-bold leading-tight tracking-tight'>{offerTitle}</span>
        <div className='flex flex-col'>
            <span className={`text-sm font-semibold uppercase ${discountColor}`}>{discountOffer}</span>
            <div className='flex gap-1 text-xs'>
                <span className='font-semibold'>{tier.name}</span>
                <span className='text-grey-700'>{cadence}</span>
            </div>
            <div className='mt-2 flex items-end justify-between'>
                <a className='text-xs text-grey-700 hover:text-black hover:underline' href={createRedemptionFilterUrl(offerId)}>{redemptions} redemptions</a>
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

    const activeOffers = allOffers.filter(offer => offer.status === 'active');

    activeOffers.sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at) : new Date(0);
        const dateB = b.created_at ? new Date(b.created_at) : new Date(0);
        return dateB.getTime() - dateA.getTime();
    });

    const latestThree = activeOffers.slice(0, 3);

    const openModal = () => {
        updateRoute('offers/edit');
    };

    const goToOfferEdit = (offerId: string) => {
        updateRoute(`offers/edit/${offerId}`);
    };

    return (
        <TopLevelGroup
            customButtons={<Button color='green' disabled={!checkStripeEnabled(settings, config)} label='Manage offers' link linkWithPadding onClick={openModal}/>}
            description={<>Grow your audience by providing fixed or percentage discounts. {allOffers.length === 0 && <a className='text-green' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">Learn more</a>}</>}
            keywords={keywords}
            navid='offers'
            testId='offers'
            title='Offers'
        >
            <div>
                <div className='grid grid-cols-3 gap-4'>
                    {
                        latestThree.map((offer) => {
                            const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);
                            if (!offerTier) {
                                return null;
                            }
                            return <OfferContainer
                                key={offer.id}
                                amount={offer.amount}
                                cadence={offer.cadence}
                                currency={offer.currency || 'USD'}
                                goToOfferEdit={goToOfferEdit}
                                offerCode={offer.code}
                                offerId={offer.id}
                                offerTitle={offer.name}
                                redemptions={offer.redemption_count}
                                tier={offerTier}
                                type={offer.type}
                            />;
                        })
                    }
                </div>
                {allOffers.length > 3 && <div className='mt-4 border-t border-t-grey-200 pt-2'>
                    <Button className='text-sm font-bold text-green' label='Show all' size='sm' link unstyled onClick={openModal} />
                </div>}
            </div>
        </TopLevelGroup>
    );
};

export default withErrorBoundary(Offers, 'Portal settings');
