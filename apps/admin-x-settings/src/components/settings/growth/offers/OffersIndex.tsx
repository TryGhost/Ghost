import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import {Button, Tab, TabView} from '@tryghost/admin-x-design-system';
import {Icon} from '@tryghost/admin-x-design-system';
import {Modal} from '@tryghost/admin-x-design-system';
import {SortMenu} from '@tryghost/admin-x-design-system';
import {Tier, getPaidActiveTiers, useBrowseTiers} from '@tryghost/admin-x-framework/api/tiers';
import {Tooltip} from '@tryghost/admin-x-design-system';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';
import {getHomepageUrl} from '@tryghost/admin-x-framework/api/site';
import {numberWithCommas} from '../../../../utils/helpers';
import {useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {useEffect, useState} from 'react';
import {useGlobalData} from '../../../providers/GlobalDataProvider';
import {useModal} from '@ebay/nice-modal-react';
import {useRouting} from '@tryghost/admin-x-framework/routing';

export type OfferType = 'percent' | 'fixed' | 'trial';

export const createRedemptionFilterUrl = (id: string): string => {
    const baseHref = '/ghost/#/members';
    return `${baseHref}?filter=${encodeURIComponent('offer_redemptions:' + id)}`;
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

export const CopyLinkButton: React.FC<{offerCode: string}> = ({offerCode}) => {
    const [isCopied, setIsCopied] = useState(false);
    const {siteData} = useGlobalData();

    const handleCopyClick = (e?: React.MouseEvent<HTMLElement, MouseEvent>) => {
        e?.stopPropagation();
        const offerLink = `${getHomepageUrl(siteData!)}${offerCode}`;
        navigator.clipboard.writeText(offerLink);
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    };

    return <Tooltip containerClassName='group-hover:opacity-100 opacity-0 flex items-center -mr-1 justify-center leading-none w-5 h-5' content={isCopied ? 'Copied' : 'Copy link'} size='sm'><Button color='clear' hideLabel={true} icon={isCopied ? 'check-circle' : 'hyperlink-circle'} iconColorClass={isCopied ? 'text-green w-[14px] h-[14px]' : 'w-[18px] h-[18px]'} label={isCopied ? 'Copied' : 'Copy'} unstyled={true} onClick={handleCopyClick} /></Tooltip>;
};

const OfferCard: React.FC<{amount: number, cadence: string, currency: string, duration: string, name: string, code: string, offerId: string, offerTier: Tier | undefined, redemptionCount: number, type: OfferType, onClick: ()=>void}> = ({amount, cadence, currency, duration, name, code, offerId, offerTier, redemptionCount, type, onClick}) => {
    let tierName = offerTier?.name + ' ' + getOfferCadence(cadence) + ' — ' + getOfferDuration(duration);
    const {discountColor, discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency} = getOfferDiscount(type, amount, cadence, currency || 'USD', offerTier);

    return (
        <div className='group flex cursor-pointer flex-col gap-6 border border-transparent bg-grey-100 p-5 transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800' onClick={onClick}>
            <div className='flex items-center justify-between'>
                <h2 className='text-[1.6rem] font-semibold' onClick={onClick}>{name}</h2>
                <span className={`text-xs font-semibold uppercase ${discountColor}`}>{discountOffer}</span>
            </div>
            <div className='flex items-baseline gap-1'>
                <span className='text-4xl font-bold tracking-tight'>{updatedPriceWithCurrency}</span>
                <span className='text-[1.6rem] font-medium text-grey-700 line-through'>{originalPriceWithCurrency}</span>
            </div>
            <div className='flex items-end justify-between'>
                <div className='flex flex-col items-start text-xs'>
                    <span className='font-medium'>{tierName}</span>
                    <a className='text-grey-700 hover:underline' href={createRedemptionFilterUrl(offerId)}>{redemptionCount} redemptions</a>
                </div>
                <CopyLinkButton offerCode={code} />
            </div>
        </div>
    );
};

const EmptyScreen: React.FC = () => {
    const {updateRoute} = useRouting();

    return <div className='flex h-full flex-col items-center justify-center text-center'>
        <Icon colorClass='text-grey-700' name='ai-tagging-spark' size='xl' />
        <h1 className='mt-6 text-4xl'>Provide offers to new signups</h1>
        <div className='max-w-[420px]'>
            <p className='mt-3 text-[1.6rem]'>Boost your subscriptions by creating targeted discounts to potential members.</p>
            <div className='mt-8'>
                <Button color='green' label='Create first offer' fullWidth onClick={() => updateRoute('offers/new')} />
            </div>
        </div>
    </div>;
};

export const OffersIndexModal = () => {
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
    const activeOffers = allOffers.filter(offer => offer.status === 'active');

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
    const [sortOption, setSortOption] = useState('date-added');
    const [sortDirection, setSortDirection] = useState('desc');

    const handleOfferEdit = (id:string) => {
        // TODO: implement
        updateRoute(`offers/edit/${id}`);
    };

    const sortedOffers = allOffers
        .sort((offer1, offer2) => {
            const multiplier = sortDirection === 'desc' ? -1 : 1;
            switch (sortOption) {
            case 'name':
                return multiplier * offer1.name.localeCompare(offer2.name);
            case 'redemptions':
                return multiplier * (offer1.redemption_count - offer2.redemption_count);
            default:
                // 'date-added' or unknown option, use default sorting
                return multiplier * ((offer1.created_at ? new Date(offer1.created_at).getTime() : 0) - (offer2.created_at ? new Date(offer2.created_at).getTime() : 0));
            }
        });

    const cardLayoutOutput = <div className='mt-8 grid grid-cols-3 gap-6'>
        {sortedOffers.filter(offer => offer.status === selectedTab).map((offer) => {
            const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);

            if (!offerTier) {
                return null;
            }

            return (
                <OfferCard
                    key={offer?.id}
                    amount={offer?.amount}
                    cadence={offer?.cadence}
                    code={offer?.code}
                    currency={offer?.currency || 'USD'}
                    duration={offer?.duration}
                    name={offer?.name}
                    offerId={offer?.id ? offer.id : ''}
                    offerTier={offerTier}
                    redemptionCount={offer?.redemption_count ? offer.redemption_count : 0}
                    type={offer?.type as OfferType}
                    onClick={() => handleOfferEdit(offer?.id ? offer.id : '')}
                />
            );
        })}
    </div>;

    const listLayoutOutput = <table className='m-0'>
        <tr className='border-b border-b-grey-300'>
            <th className='px-5 py-2.5 pl-0 text-xs font-normal text-grey-700'>{sortedOffers.length} {sortedOffers.length > 1 ? 'offers' : 'offer'}</th>
            <th className='px-5 py-2.5 text-xs font-normal text-grey-700'>Tier</th>
            <th className='px-5 py-2.5 text-xs font-normal text-grey-700'>Terms</th>
            <th className='px-5 py-2.5 text-xs font-normal text-grey-700'>Price</th>
            <th className='px-5 py-2.5 text-xs font-normal text-grey-700'>Redemptions</th>
            <th className='min-w-[80px] px-5 py-2.5 pr-0 text-xs font-normal text-grey-700'></th>
        </tr>
        {sortedOffers.filter(offer => offer.status === selectedTab).map((offer) => {
            const offerTier = paidActiveTiers.find(tier => tier.id === offer?.tier.id);

            if (!offerTier) {
                return null;
            }

            const {discountColor, discountOffer, originalPriceWithCurrency, updatedPriceWithCurrency} = getOfferDiscount(offer.type, offer.amount, offer.cadence, offer.currency || 'USD', offerTier);

            return (
                <tr className='group border-b border-b-grey-200'>
                    <td className='p-0 font-semibold'><a className='block cursor-pointer p-5 pl-0' onClick={() => handleOfferEdit(offer?.id ? offer.id : '')}>{offer?.name}</a></td>
                    <td className='p-0 text-sm'><a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer?.id ? offer.id : '')}>{offerTier.name} {getOfferCadence(offer.cadence)}</a></td>
                    <td className='p-0 text-sm'><a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer?.id ? offer.id : '')}><span className={`font-semibold uppercase ${discountColor}`}>{discountOffer}</span> — {getOfferDuration(offer.duration)}</a></td>
                    <td className='p-0 text-sm'><a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer?.id ? offer.id : '')}>{updatedPriceWithCurrency} <span className='text-grey-700 line-through'>{originalPriceWithCurrency}</span></a></td>
                    <td className='p-0 text-sm'><a className='block cursor-pointer p-5 hover:underline' href={createRedemptionFilterUrl(offer.id ? offer.id : '')}>{offer.redemption_count}</a></td>
                    <td className='min-w-[80px] p-5 pr-0 text-right text-sm leading-none'><CopyLinkButton offerCode={offer.code} /></td>
                </tr>
            );
        })}
    </table>;

    return <Modal
        afterClose={() => {
            updateRoute('offers');
        }}
        animate={false}
        cancelLabel=''
        footer={
            activeOffers.length > 0 ?
                <div className='mx-8 flex w-full items-center justify-between'>
                    <a className='text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
                    <Button color='black' label='Close' onClick={() => {
                        modal.remove();
                        updateRoute('offers');
                    }} />
                </div> :
                false
        }
        header={false}
        height='full'
        size='lg'
        testId='offers-modal'
        stickyFooter
    >
        {activeOffers.length > 0 ?
            <div className='pt-6'>
                <header>
                    <div className='flex items-center justify-between'>
                        <div>
                            {sortedOffers.some(offer => offer.hasOwnProperty('status') && offer.status === 'archived') ?
                                <TabView
                                    border={false}
                                    selectedTab={selectedTab}
                                    tabs={offersTabs}
                                    width='wide'
                                    onTabChange={setSelectedTab}
                                /> :
                                null
                            }
                        </div>
                        <Button color='green' icon='add' iconColorClass='green' label='New offer' link={true} size='sm' onClick={() => updateRoute('offers/new')} />
                    </div>
                    <div className='mt-12 flex items-center justify-between border-b border-b-grey-300 pb-2.5'>
                        <h1 className='text-3xl'>{offersTabs.find(tab => tab.id === selectedTab)?.title} offers</h1>
                        <div className='flex gap-3'>
                            <SortMenu
                                direction='desc'
                                items={[
                                    {id: 'date-added', label: 'Date added', selected: sortOption === 'date-added'},
                                    {id: 'name', label: 'Name', selected: sortOption === 'name'},
                                    {id: 'redemptions', label: 'Redemptions', selected: sortOption === 'redemptions'}
                                ]}
                                position='right'
                                onDirectionChange={(selectedDirection) => {
                                    const newDirection = selectedDirection === 'asc' ? 'desc' : 'asc';
                                    setSortDirection(newDirection);
                                }}
                                onSortChange={(selectedOption) => {
                                    setSortOption(selectedOption);
                                }}
                            />
                            <div className='flex gap-3'>
                                <Button icon='layout-module-1' iconColorClass={selectedLayout === 'card' ? 'text-black' : 'text-grey-500'} link={true} size='sm' onClick={() => setSelectedLayout('card')} />
                                <Button icon='layout-headline' iconColorClass={selectedLayout === 'list' ? 'text-black' : 'text-grey-500'} link={true} size='sm' onClick={() => setSelectedLayout('list')} />
                            </div>
                        </div>
                    </div>
                </header>
                {selectedLayout === 'card' ? cardLayoutOutput : listLayoutOutput}
            </div> :
            <EmptyScreen />
        }
    </Modal>;
};
