import AddOfferModal from './AddOfferModal';
import EditOfferModal from './EditOfferModal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {Button, Modal} from '@tryghost/admin-x-design-system';
import {OffersList} from './OffersList';
import {Tier} from '../../../../api/tiers';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {numberWithCommas} from '../../../../utils/helpers';
import {useEffect, useState} from 'react';

const createRedemptionFilterUrl = (id: string): string => {
    const baseHref = '/ghost/#/members';
    return `${baseHref}?filter=${encodeURIComponent('offer_redemptions:' + id)}`;
};

export type OfferType = 'percent' | 'fixed' | 'trial';

export type OfferCardProps = {
    amount: number;
    cadence: string;
    currency: string;
    duration: string;
    name: string;
    offerId: string;
    offerTier: Tier | undefined;
    redemptionCount: number;
    type: OfferType;
    onClick: () => void;
  };

const OfferCard: React.FC<{amount: number, cadence: string, currency: string, duration: string, name: string, offerId: string, offerTier: Tier | undefined, redemptionCount: number, type: OfferType, onClick: ()=>void}> = ({amount, cadence, currency, duration, name, offerId, offerTier, redemptionCount, type, onClick}) => {
    let discountColor = '';
    let discountOffer = '';
    const originalPrice = cadence === 'month' ? offerTier?.monthly_price ?? 0 : offerTier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;
    let tierName = offerTier?.name + ' ' + (cadence === 'month' ? 'Monthly' : 'Yearly') + ' — ' + (duration === 'once' ? 'First payment' : duration === 'repeating' ? 'Repeating' : 'Forever');
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
    }

    const updatedPriceWithCurrency = getSymbol(currency) + numberWithCommas(currencyToDecimal(updatedPrice));

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

    const [viewState, setViewState] = useState<'list' | 'add' | 'edit'>('list');

    const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);

    useEffect(() => {
        if (!hasOffers) {
            modal.remove();
            updateRoute('');
        }
    }, [hasOffers, modal, updateRoute]);

    const toggleViewState = (state: 'list' | 'add' | 'edit') => {
        setViewState(state);
    };

    const selectOffer = (id: string) => {
        setSelectedOfferId(id);
    };

    return <Modal
        afterClose={() => {
            updateRoute('offers');
        }}
        cancelLabel=''
        footer={
            viewState === 'list' && <div className='mx-8 flex w-full items-center justify-between'>
                <a className='text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
                <Button color='black' label='Close' onClick={() => {
                    modal.remove();
                    updateRoute('offers');
                }} />
            </div>
        }
        header={false}
        size='lg'
        stickyFooter={viewState === 'list'}
        testId='offers-modal'
    >
        {
            viewState === 'list' && <OffersList OfferCard={OfferCard} SelectOffer={selectOffer} ToggleViewState={toggleViewState} />
        }
        {
            viewState === 'add' && <AddOfferModal onBack={toggleViewState}/>
        }
        {
            (viewState === 'edit' && selectedOfferId) && <EditOfferModal id={selectedOfferId} onBack={toggleViewState} />
        }
    </Modal>;
};

export default NiceModal.create(OffersModal);
