import Button from '../../../../admin-x-ds/global/Button';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Tier} from '../../../../api/tiers';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';
import {numberWithCommas} from '../../../../utils/helpers';
import {useBrowseOffers} from '../../../../api/offers';
import {useEffect, useState} from 'react';

export type OfferType = 'percent' | 'fixed' | 'trial';

const createRedemptionFilterUrl = (id: string): string => {
    const baseHref = '/ghost/#/members';
    return `${baseHref}?filter=${encodeURIComponent('offer_redemptions:' + id)}`;
};

const OfferCard: React.FC<{amount: number, cadence: string, currency: string, duration: string, name: string, offerId: string, offerTier: Tier | undefined, redemptionCount: number, type: OfferType, onClick: ()=>void}> = ({amount, cadence, currency, duration, name, offerId, offerTier, redemptionCount, type, onClick}) => {
    let discountColor = '';
    let discountOffer = '';
    const originalPrice = cadence === 'month' ? offerTier?.monthly_price ?? 0 : offerTier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;
    let tierName = offerTier?.name + ' ' + (cadence === 'month' ? 'Monthly' : 'Yearly') + ' - ' + (duration === 'once' ? 'First payment' : duration === 'repeating' ? 'Repeating' : 'Forever');
    let originalPriceWithCurrency = getSymbol(currency) + numberWithCommas(currencyToDecimal(originalPrice));

    switch (type) {
    case 'percent':
        discountColor = 'text-green';
        discountOffer = amount + '% OFF';
        updatedPrice = originalPrice - ((originalPrice * amount) / 100);
        break;
    case 'fixed':
        discountColor = 'text-blue';
        discountOffer = numberWithCommas(currencyToDecimal(amount)) + ' ' + currency + ' OFF';
        updatedPrice = originalPrice - amount;
        break;
    case 'trial':
        discountColor = 'text-pink';
        discountOffer = amount + ' DAYS FREE';
        originalPriceWithCurrency = '';
        break;
    default:
        break;
    }

    const updatedPriceWithCurrency = getSymbol(currency) + numberWithCommas(currencyToDecimal(updatedPrice));

    return <div className='flex flex-col items-center gap-6 border border-transparent bg-grey-100 p-5 text-center transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800'>
        <h2 className='cursor-pointer text-[1.6rem]' onClick={onClick}>{name}</h2>
        <div className=''>
            <div className='flex gap-3 text-sm uppercase leading-none'>
                <span className={`font-semibold ${discountColor}`}>{discountOffer}</span>
                <span className='text-grey-700 line-through'>{originalPriceWithCurrency}</span>
            </div>
            <span className='text-3xl font-bold'>{updatedPriceWithCurrency}</span>
        </div>
        <div className='flex flex-col items-center text-xs'>
            <span className='font-medium'>{tierName}</span>
            <a className='text-grey-700 hover:underline' href={createRedemptionFilterUrl(offerId)}>{redemptionCount} redemptions</a>
        </div>
    </div>;
};

const OffersModal = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');
    const {data: {offers = []} = {}} = useBrowseOffers({
        searchParams: {
            limit: 'all'
        }
    });
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    useEffect(() => {
        if (!hasOffers) {
            modal.remove();
            updateRoute('');
        }
    }, [hasOffers, modal, updateRoute]);

    let offersTabs: Tab[] = [
        {id: 'active', title: 'Active'},
        {id: 'archived', title: 'Archived'}
    ];
    const [selectedTab, setSelectedTab] = useState('active');
  
    const handleOfferEdit = (id:string) => {
        // TODO: implement
        modal.remove();
        updateRoute(`offers/${id}`);
    };

    return <Modal 
        afterClose={() => {
            updateRoute('offers');
        }}
        cancelLabel='' header={false}
        size='lg'
        testId='offers-modal'
        onOk={() => {
            modal.remove();
            updateRoute('offers');
        }}
    >
        <div className='pt-6'>
            <header>
                <div className='flex items-center justify-between'>
                    <TabView
                        border={false}
                        selectedTab={selectedTab}
                        tabs={offersTabs}
                        width='wide'
                        onTabChange={setSelectedTab}
                    />
                    <Button color='green' icon='add' iconColorClass='green' label='New offer' link={true} size='sm' onClick={() => updateRoute('offers/new')} />
                </div>
                <h1 className='mt-12 border-b border-b-grey-300 pb-2.5 text-3xl'>{offersTabs.find(tab => tab.id === selectedTab)?.title} offers</h1>
            </header>
            <div className='mt-8 grid grid-cols-3 gap-6'>
                {offers.filter(offer => offer.status === selectedTab).map((offer) => {
                    const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);

                    return (
                        <OfferCard
                            key={offer?.id}
                            amount={offer?.amount}
                            cadence={offer?.cadence}
                            currency={offer?.currency || 'USD'}
                            duration={offer?.duration}
                            name={offer?.name}
                            offerId={offer?.id}
                            offerTier={offerTier}
                            redemptionCount={offer?.redemption_count}
                            type={offer?.type as OfferType}
                            onClick={() => handleOfferEdit(offer?.id)}
                        />
                    );
                })}
            </div>
            <a className='absolute bottom-10 text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
        </div>
    </Modal>;
};

export default NiceModal.create(OffersModal);
