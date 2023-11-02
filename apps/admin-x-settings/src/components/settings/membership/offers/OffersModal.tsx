import Button from '../../../../admin-x-ds/global/Button';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {useEffect, useState} from 'react';
import {useBrowseOffers} from '../../../../api/offers';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {numberWithCommas} from '../../../../utils/helpers';
import {Tier, getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';

export type OfferType = 'percent' | 'fixed' | 'trial';

const OfferCard: React.FC<{name: string, type: OfferType, redemption_count: number, amount: number, currency: string, offerTier: Tier | undefined, cadence: string, duration: string}> = ({name, type, redemption_count, amount, currency, offerTier, cadence,duration}) => {
    let discountColor = '';
    let discountOffer = '';
    const originalPrice = cadence === 'month' ? offerTier?.monthly_price ?? 0 : offerTier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;
    let tierName = offerTier?.name + ' ' + (cadence === 'month' ? 'Monthly' : 'Yearly') + ' - ' + (duration === 'once' ? 'First payment' : duration === 'repeating' ? 'Repeating' : 'Forever');

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
        break;
    default:
        break;
    }

    return <div className='flex flex-col items-center gap-6 border border-transparent bg-grey-100 p-5 text-center transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800'>
        <h2 className='text-[1.6rem]'>{name}</h2>
        <div className=''>
            <div className='flex gap-3 text-sm uppercase leading-none'>
                <span className={`font-semibold ${discountColor}`}>{discountOffer}</span>
                <span className='text-grey-700 line-through'>{getSymbol(currency) + numberWithCommas(currencyToDecimal(originalPrice))}</span>
            </div>
            <span className='text-3xl font-bold'>{getSymbol(currency) + numberWithCommas(currencyToDecimal(updatedPrice))}</span>
        </div>
        <div className='flex flex-col items-center text-xs'>
            <span className='font-medium'>{tierName}</span>
            <a className='text-grey-700 hover:underline' href="/ghost/#/members">{redemption_count} redemptions</a>
        </div>
    </div>;
};

const OffersModal = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');
    const { data: { offers = [] } = {} } = useBrowseOffers({
        searchParams: {
            limit: 'all',
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

    return <Modal 
        afterClose={() => {
            updateRoute('offers');
        }}
        onOk={() => {
            modal.remove();
            updateRoute('offers');
        }}
        cancelLabel='' header={false}
        size='lg'>
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
                    <Button color='green' icon='add' iconColorClass='green' label='New offer' link={true} size='sm' />
                </div>
                <h1 className='mt-12 border-b border-b-grey-300 pb-2.5 text-3xl'>Active offers</h1>
            </header>
            <div className='mt-8 grid grid-cols-3 gap-6'>
                {offers.filter(offer => offer.status === selectedTab).map((offer) => {
                    const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);

                    return (
                    <OfferCard
                        key={offer?.id}
                        name={offer?.name}
                        type={offer?.type as OfferType}
                        redemption_count={offer?.redemption_count}
                        amount={offer?.amount}
                        currency={offer?.currency || 'USD'}
                        cadence={offer?.cadence}
                        offerTier={offerTier}
                        duration={offer?.duration}
                    />
                    );
                })}
            </div>
            <a className='absolute bottom-10 text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
        </div>
    </Modal>;
};

export default NiceModal.create(OffersModal);
