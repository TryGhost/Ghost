import {Button, type ButtonProps, showToast} from '@tryghost/admin-x-design-system';
import {ButtonGroup} from '@tryghost/admin-x-design-system';
import {Icon} from '@tryghost/admin-x-design-system';
import {LucideIcon} from '@tryghost/shade';
import {Modal} from '@tryghost/admin-x-design-system';
import {Popover} from '@tryghost/admin-x-design-system';
import {type RetentionOffer, getRetentionOffers} from './offers-retention';
import {type Tier, getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {Toggle} from '@tryghost/admin-x-design-system';
import {createOfferRedemptionsFilterUrl} from './offer-helpers';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {numberWithCommas} from '../../../../utils/helpers';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useModal} from '@ebay/nice-modal-react';
import {useOffersShowArchived, useSortingState} from '../../../providers/settings-app-provider';
import {useRouting} from '@tryghost/admin-x-framework/routing';

export type OfferType = 'percent' | 'fixed' | 'trial';

export const createRedemptionFilterUrl = (id: string): string => {
    const baseHref = '/ghost/#/members';
    const filterValue = `offer_redemptions:[${id}]`;
    return `${baseHref}?filter=${encodeURIComponent(filterValue)}`;
};

export const getOfferCadence = (cadence: string): string => {
    return cadence === 'month' ? 'monthly' : 'yearly';
};

export const getOfferDuration = (duration: string): string => {
    return (duration === 'once' ? 'First payment' : duration === 'repeating' ? 'Repeating' : 'Forever');
};

export const getOfferDiscount = (type: string, amount: number, cadence: string, currency: string, tier: Tier | undefined): {discountColor: string, discountOffer: string, originalPriceWithCurrency: string, updatedPriceWithCurrency: string} => {
    let discountColor = '';
    let discountOffer = '';
    const originalPrice = cadence === 'month' ? tier?.monthly_price ?? 0 : tier?.yearly_price ?? 0;
    let updatedPrice = originalPrice;

    const formatToTwoDecimals = (num: number): number => parseFloat(num.toFixed(2));

    let originalPriceWithCurrency = getSymbol(currency) + numberWithCommas(formatToTwoDecimals(currencyToDecimal(originalPrice)));

    switch (type) {
    case 'percent':
        discountColor = 'text-green';
        discountOffer = amount + '% off';
        updatedPrice = originalPrice - ((originalPrice * amount) / 100);
        break;
    case 'fixed':
        discountColor = 'text-blue';
        discountOffer = numberWithCommas(formatToTwoDecimals(currencyToDecimal(amount))) + ' ' + currency + ' off';
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

    if (updatedPrice < 0) {
        updatedPrice = 0;
    }

    const updatedPriceWithCurrency = getSymbol(currency) + numberWithCommas(formatToTwoDecimals(currencyToDecimal(updatedPrice)));

    return {
        discountColor,
        discountOffer,
        originalPriceWithCurrency,
        updatedPriceWithCurrency
    };
};

const OffersFilterPopover: React.FC<{
    showArchived: boolean;
    setShowArchived: (show: boolean) => void;
    sortOption: string;
    sortDirection: string;
    onSortChange: (option: string) => void;
    onDirectionChange: () => void;
}> = ({showArchived, setShowArchived, sortOption, sortDirection, onSortChange, onDirectionChange}) => {
    return (
        <Popover
            position='end'
            trigger={
                <Button className='flex cursor-pointer items-center justify-center rounded p-1 hover:bg-grey-100 dark:hover:bg-grey-800 dark:[&_svg]:hover:text-white' label={<LucideIcon.ListFilter className='text-grey-700 dark:text-grey-500' size={16} strokeWidth={1.5} />} unstyled={true} />
            }
        >
            <div className='flex min-w-[200px] flex-col p-1 normal-case'>
                <div className='cursor-default select-none pl-3 pt-2 text-xs font-medium uppercase tracking-wide text-grey-700'>Sort by</div>
                <div className='flex flex-col py-1'>
                    {[
                        {id: 'date-added', label: 'Date added'},
                        {id: 'name', label: 'Name'},
                        {id: 'redemptions', label: 'Redemptions'}
                    ].map(item => (
                        <div
                            key={item.id}
                            className='group relative mx-1 flex items-center rounded-[2.5px] hover:bg-grey-100 dark:hover:bg-grey-800'
                        >
                            <button
                                className='flex w-full cursor-pointer items-center px-8 py-1.5 pr-12 text-left text-sm text-black dark:text-white'
                                type='button'
                                onClick={() => onSortChange(item.id)}
                            >
                                {sortOption === item.id && <Icon className='absolute left-2' name='check' size='xs' />}
                                {item.label}
                            </button>
                            {sortOption === item.id && (
                                <button
                                    className='absolute right-1 flex size-6 cursor-pointer items-center justify-center rounded-full hover:bg-grey-300 dark:hover:bg-grey-700'
                                    title={sortDirection === 'asc' ? 'Ascending' : 'Descending'}
                                    type='button'
                                    onClick={() => onDirectionChange()}
                                >
                                    <Icon name={sortDirection === 'asc' ? 'arrow-up' : 'arrow-down'} size='xs' />
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className='-mx-1 mt-1 border-t border-t-grey-200 dark:border-t-grey-800'>
                    <div className='group relative mx-2 mt-1 flex items-center rounded-[2.5px] py-1'>
                        <div className='flex w-full items-center px-8 py-1.5 pr-2 text-sm text-black dark:text-white'>
                            <LucideIcon.Archive className='absolute left-2 -mt-0.5 text-black dark:text-white' size={14} strokeWidth={1.5} />
                            <div className='grow [&>div]:w-full'>
                                <Toggle
                                    checked={showArchived}
                                    direction='rtl'
                                    label='Show archived'
                                    labelClasses='text-sm text-black dark:text-white'
                                    onChange={(e) => {
                                        setShowArchived(e.target.checked);
                                    }}
                                />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </Popover>
    );
};

const RetentionOfferRow: React.FC<{
    offer: RetentionOffer;
    onClick: () => void;
}> = ({offer, onClick}) => {
    const redemptionFilterUrl = offer.redemptions > 0 && offer.redemptionOfferIds.length > 0
        ? createOfferRedemptionsFilterUrl(offer.redemptionOfferIds)
        : undefined;

    return (
        <tr className='group relative scale-100 border-b border-b-grey-200 dark:border-grey-800' data-testid='retention-offer-item'>
            <td className='p-0'>
                <button className='block w-full cursor-pointer p-5 pl-0 text-left' type="button" onClick={onClick}>
                    <span className='font-semibold'>{offer.name}</span><br />
                    <span className='text-sm text-grey-700'>{offer.description}</span>
                </button>
            </td>
            <td className='whitespace-nowrap p-0 text-sm'>
                <button className='block w-full cursor-pointer p-5 text-left' type="button" onClick={onClick}>
                    {offer.terms ? (
                        <>
                            <span className='text-[1.3rem] font-medium uppercase'>{offer.terms}</span><br />
                            <span className='text-grey-700'>{offer.termsDetail}</span>
                        </>
                    ) : (
                        <span className='text-grey-700'>&ndash;</span>
                    )}
                </button>
            </td>
            <td className='whitespace-nowrap p-0 text-sm'>
                <button className='block w-full cursor-pointer p-5 text-left' type="button" onClick={onClick}>
                    <span className='text-grey-700'>&ndash;</span>
                </button>
            </td>
            <td className='whitespace-nowrap p-0 text-sm'>
                {redemptionFilterUrl ? (
                    <a
                        className='block cursor-pointer p-5 hover:underline'
                        data-testid={`retention-redemptions-link-${offer.id}`}
                        href={redemptionFilterUrl}
                    >
                        {offer.redemptions}
                    </a>
                ) : (
                    <button
                        className='block w-full cursor-pointer p-5 text-left'
                        data-testid={`retention-redemptions-link-${offer.id}`}
                        type="button"
                        onClick={onClick}
                    >
                        {offer.redemptions}
                    </button>
                )}
            </td>
            <td className='whitespace-nowrap p-0 text-sm'>
                <button className='block w-full cursor-pointer p-5 text-left' type="button" onClick={onClick}>
                    {offer.status === 'active' ? (
                        <span className='inline-flex items-center rounded-full bg-[rgba(48,207,67,0.15)] px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-green'>Active</span>
                    ) : (
                        <span className='inline-flex items-center rounded-full bg-grey-200 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-grey-700 dark:bg-grey-900 dark:text-grey-500'>Inactive</span>
                    )}
                </button>
            </td>
        </tr>
    );
};

export const OffersIndexModal: React.FC = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const {data: {offers: allOffers = []} = {}} = useBrowseOffers();
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const signupOffers = allOffers.filter(offer => offer.redemption_type === 'signup');
    const retentionOffers = getRetentionOffers(allOffers);
    const {sortingState, setSortingState} = useSortingState();
    const offersSorting = sortingState?.find(sorting => sorting.type === 'offers');

    const {offersShowArchived: showArchived, setOffersShowArchived: setShowArchived} = useOffersShowArchived();

    const sortOption = offersSorting?.option || 'date-added';
    const sortDirection = offersSorting?.direction || 'desc';

    const handleOfferEdit = (id: string) => {
        if (!id) {
            return;
        }
        sessionStorage.setItem('editOfferPageSource', 'offersIndex');
        updateRoute(`offers/edit/${id}`);
    };

    const handleRetentionOfferEdit = (id: string) => {
        updateRoute(`offers/edit/retention/${id}`);
    };

    const sortedOffers = signupOffers
        .sort((offer1, offer2) => {
            const multiplier = sortDirection === 'desc' ? -1 : 1;
            switch (sortOption) {
            case 'name':
                return multiplier * offer1.name.localeCompare(offer2.name);
            case 'redemptions':
                return multiplier * (offer1.redemption_count - offer2.redemption_count);
            default:
                return multiplier * ((offer1.created_at ? new Date(offer1.created_at).getTime() : 0) - (offer2.created_at ? new Date(offer2.created_at).getTime() : 0));
            }
        });

    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    const filteredSignupOffers = sortedOffers.filter((offer) => {
        const offerTier = allTiers?.find(tier => tier.id === offer?.tier?.id);
        const isActive = offer.status === 'active' && offerTier && offerTier.active === true;
        const isArchived = offer.status === 'archived' || (offerTier && offerTier.active === false);

        if (isActive) {
            return true;
        }
        if (showArchived && isArchived) {
            return true;
        }
        return false;
    });

    const handleSortChange = (selectedOption: string) => {
        setSortingState?.([{
            type: 'offers',
            option: selectedOption,
            direction: sortDirection
        }]);
    };

    const handleDirectionChange = () => {
        const newDirection = sortDirection === 'asc' ? 'desc' : 'asc';
        setSortingState?.([{
            type: 'offers',
            option: sortOption,
            direction: newDirection
        }]);
    };

    const isOfferArchived = (offer: typeof signupOffers[0]) => {
        const offerTier = allTiers?.find(tier => tier.id === offer?.tier?.id);
        return offer.status === 'archived' || (offerTier && offerTier.active === false);
    };

    const buttons: ButtonProps[] = [
        {
            key: 'cancel-modal',
            label: 'Close',
            onClick: () => {
                modal.remove();
                updateRoute('offers');
            }
        },
        {
            key: 'new-offer',
            icon: 'add',
            label: 'New offer',
            color: 'green' as const,
            onClick: () => {
                if (paidActiveTiers.length === 0) {
                    showToast({
                        type: 'info',
                        title: 'You must have an active tier to create an offer.'
                    });
                } else {
                    updateRoute('offers/new');
                }
            }
        }
    ];

    const listLayoutOutput = <div className='overflow-x-auto'>
        <table className='m-0 w-full table-fixed'>
            <colgroup>
                <col />
                <col className='w-[200px]' />
                <col className='w-[200px]' />
                <col className='w-[200px]' />
                <col className='w-[200px]' />
            </colgroup>
            <thead>
                <tr className='border-b border-b-grey-200 dark:border-grey-800'>
                    <th className='p-0 pb-2.5 pl-0 text-left text-xs font-medium uppercase tracking-wide text-grey-700'>Name</th>
                    <th className='p-0 pb-2.5 pl-5 text-left text-xs font-medium uppercase tracking-wide text-grey-700'>Terms</th>
                    <th className='p-0 pb-2.5 pl-5 text-left text-xs font-medium uppercase tracking-wide text-grey-700'>Price</th>
                    <th className='p-0 pb-2.5 pl-5 text-left text-xs font-medium uppercase tracking-wide text-grey-700'>Redemptions</th>
                    <th className='p-0 pb-2.5 pl-5 text-left text-xs font-medium uppercase tracking-wide text-grey-700'>
                        <span className='flex items-center justify-between'>
                            Status
                            <OffersFilterPopover
                                setShowArchived={setShowArchived}
                                showArchived={showArchived}
                                sortDirection={sortDirection}
                                sortOption={sortOption}
                                onDirectionChange={handleDirectionChange}
                                onSortChange={handleSortChange}
                            />
                        </span>
                    </th>
                </tr>
            </thead>
            <tbody>
                {retentionOffers.map(offer => (
                    <RetentionOfferRow
                        key={offer.id}
                        offer={offer}
                        onClick={() => handleRetentionOfferEdit(offer.id)}
                    />
                ))}
                {filteredSignupOffers.map((offer) => {
                    const offerTier = allTiers?.find(tier => tier.id === offer?.tier?.id);

                    if (!offerTier) {
                        return null;
                    }

                    const archived = isOfferArchived(offer);

                    const {discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency} = getOfferDiscount(offer.type, offer.amount, offer.cadence, offer.currency || 'USD', offerTier);

                    return (
                        <tr key={offer.id} className={`group relative scale-100 border-b border-b-grey-200 dark:border-grey-800 ${archived ? 'opacity-60' : ''}`} data-testid="offer-item">
                            <td className='p-0'><a className='block cursor-pointer p-5 pl-0' onClick={() => handleOfferEdit(offer.id)}><span className='font-semibold'>{offer?.name}</span><br /><span className='text-sm text-grey-700'>{offerTier.name} {getOfferCadence(offer.cadence)}</span></a></td>
                            <td className='whitespace-nowrap p-0 text-sm'><a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer.id)}><span className='text-[1.3rem] font-medium uppercase'>{discountOffer}</span><br /><span className='text-grey-700'>{offer.type !== 'trial' ? getOfferDuration(offer.duration) : 'Trial period'}</span></a></td>
                            <td className='whitespace-nowrap p-0 text-sm'><a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer.id)}><span className='font-medium'>{updatedPriceWithCurrency}</span> {offer.type !== 'trial' ? <span className='relative text-xs text-grey-700 before:absolute before:-inset-x-0.5 before:top-1/2 before:rotate-[-20deg] before:border-t before:content-[""]'>{originalPriceWithCurrency}</span> : null}</a></td>
                            <td className='whitespace-nowrap p-0 text-sm'><a className={`block cursor-pointer p-5 ${offer.redemption_count === 0 ? '' : 'hover:underline'}`} href={offer.redemption_count > 0 && offer.id ? createRedemptionFilterUrl(offer.id) : undefined} onClick={offer.redemption_count === 0 && offer.id ? () => handleOfferEdit(offer.id) : undefined}>{offer.redemption_count}</a></td>
                            <td className='whitespace-nowrap p-0 text-sm'>
                                <a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer.id)}>
                                    {archived ? (
                                        <span className='inline-flex items-center rounded-full bg-grey-200 px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-grey-700 dark:bg-grey-900 dark:text-grey-500'>Archived</span>
                                    ) : (
                                        <span className='inline-flex items-center rounded-full bg-[rgba(48,207,67,0.15)] px-2 py-0.5 text-2xs font-semibold uppercase tracking-wide text-green'>Active</span>
                                    )}
                                </a>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    </div>;

    return <Modal
        afterClose={() => {
            updateRoute('offers');
        }}
        animate={false}
        backDropClick={false}
        cancelLabel=''
        footer={false}
        height='full'
        size='lg'
        testId='offers-modal'
        title='Offers'
        topRightContent={<ButtonGroup buttons={buttons} />}
        width={1140}
    >
        <div className='flex h-full flex-col pt-8'>
            {listLayoutOutput}
        </div>
    </Modal>;
};
