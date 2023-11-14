import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Button, Modal, Tab, TabView} from '@tryghost/admin-x-design-system';
import {Tier, getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {numberWithCommas} from '../../../../utils/helpers';
import {useBrowseOffers} from '../../../../api/offers';
import {useEffect, useState} from 'react';

export type OfferType = 'percent' | 'fixed' | 'trial';

const createRedemptionFilterUrl = (id: string): string => {
    const baseHref = '/ghost/#/members';
    return `${baseHref}?filter=${encodeURIComponent('offer_redemptions:' + id)}`;
};

const getOfferCadence = (cadence: string): string => {
    return cadence === 'month' ? 'monthly' : 'yearly';
};

const getOfferDuration = (duration: string): string => {
    return (duration === 'once' ? 'First payment' : duration === 'repeating' ? 'Repeating' : 'Forever');
};

const getOfferDiscount = (type: string, amount: number, cadence: string, currency: string, tier: Tier | undefined): {discountColor: string, discountOffer: string, originalPriceWithCurrency: string, updatedPriceWithCurrency: string} => {
    let discountColor = '';
    let discountOffer = '';
    const originalPrice = cadence === 'month' ? tier?.monthly_price ?? 0 : tier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;
    let originalPriceWithCurrency = getSymbol(currency) + numberWithCommas(currencyToDecimal(originalPrice));

    switch (type) {
    case 'percent':
        discountColor = 'text-green';
        discountOffer = amount + '% off';
        updatedPrice = originalPrice - ((originalPrice * amount) / 100);
        break;
    case 'fixed':
        discountColor = 'text-blue';
        discountOffer = numberWithCommas(currencyToDecimal(amount)) + ' ' + currency + ' off';
        updatedPrice = originalPrice - amount;
        break;
    case 'trial':
        discountColor = 'text-pink';
        discountOffer = amount + ' days free';
        originalPriceWithCurrency = '';
        break;
    default:
        break;
    };

    const updatedPriceWithCurrency = getSymbol(currency) + numberWithCommas(currencyToDecimal(updatedPrice));

    return {
        discountColor,
        discountOffer,
        originalPriceWithCurrency,
        updatedPriceWithCurrency
    };
};

const OfferCard: React.FC<{amount: number, cadence: string, currency: string, duration: string, name: string, offerId: string, offerTier: Tier | undefined, redemptionCount: number, type: OfferType, onClick: ()=>void}> = ({amount, cadence, currency, duration, name, offerId, offerTier, redemptionCount, type, onClick}) => {
    let tierName = offerTier?.name + ' ' + getOfferCadence(cadence) + ' — ' + getOfferDuration(duration);
    const {discountColor, discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency} = getOfferDiscount(type, amount, cadence, currency || 'USD', offerTier);

    return (
        <div className='flex cursor-pointer flex-col gap-6 border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800' onClick={onClick}>
            <div className='flex items-center justify-between'>
                <h2 className='text-[1.6rem] font-semibold' onClick={onClick}>{name}</h2>
                <span className={`text-xs font-semibold uppercase ${discountColor}`}>{discountOffer}</span>
            </div>
            <div className='flex items-baseline gap-1'>
                <span className='text-4xl font-bold tracking-tight'>{updatedPriceWithCurrency}</span>
                <span className='text-[1.6rem] font-medium text-grey-700 line-through'>{originalPriceWithCurrency}</span>
            </div>
            <div className='flex flex-col items-start text-xs'>
                <span className='font-medium'>{tierName}</span>
                <a className='text-grey-700 hover:underline' href={createRedemptionFilterUrl(offerId)}>{redemptionCount} redemptions</a>
            </div>
        </div>
    );
};

const OffersModal = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');
    const {data: {offers: allOffers = []} = {}} = useBrowseOffers({
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
    const [selectedLayout, setSelectedLayout] = useState('card');

    const handleOfferEdit = (id:string) => {
        // TODO: implement
        modal.remove();
        updateRoute(`offers/${id}`);
    };

    const cardLayoutOutput = <div className='mt-8 grid grid-cols-3 gap-6'>
        {allOffers.filter(offer => offer.status === selectedTab).map((offer) => {
            const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);

            if (!offerTier) {
                return null;
            }

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
    </div>;

    const listLayoutOutput = <table>
        {allOffers.filter(offer => offer.status === selectedTab).map((offer) => {
            const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);

            if (!offerTier) {
                return null;
            }

            const {discountColor, discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency} = getOfferDiscount(offer.type, offer.amount, offer.cadence, offer.currency || 'USD', offerTier);

            return (
                <tr>
                    <td>{offer?.name}</td>
                    <td>{offerTier.name} {getOfferCadence(offer.cadence)}</td>
                    <td><span className={`text-xs font-semibold uppercase ${discountColor}`}>{discountOffer}</span></td>
                    <td>{updatedPriceWithCurrency}{originalPriceWithCurrency}</td>
                    <td><a className='hover:underline' href={createRedemptionFilterUrl(offer.id)}>{offer.redemption_count}</a></td>
                </tr>
            );
        })}
    </table>;

    return <Modal
        afterClose={() => {
            updateRoute('offers');
        }}
        cancelLabel=''
        footer={
            <div className='mx-8 flex w-full items-center justify-between'>
                <a className='text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
                <Button color='black' label='Close' onClick={() => {
                    modal.remove();
                    updateRoute('offers');
                }} />
            </div>
        }
        header={false}
        height='full'
        size='lg'
        testId='offers-modal'
        stickyFooter
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
                <div className='mt-12 flex items-center justify-between border-b border-b-grey-300 pb-2.5'>
                    <h1 className='text-3xl'>{offersTabs.find(tab => tab.id === selectedTab)?.title} offers</h1>
                    <div className='flex gap-3'>
                        <Button icon='layout-module-1' iconColorClass={selectedLayout === 'card' ? 'text-black' : 'text-grey-500'} link={true} size='sm' onClick={() => setSelectedLayout('card')} />
                        <Button icon='layout-headline' iconColorClass={selectedLayout === 'list' ? 'text-black' : 'text-grey-500'} link={true} size='sm' onClick={() => setSelectedLayout('list')} />
                    </div>
                </div>
            </header>
            {selectedLayout === 'card' ? cardLayoutOutput : listLayoutOutput}
        </div>
    </Modal>;
};

export default NiceModal.create(OffersModal);
