import {type Offer, useBrowseOffers} from '@tryghost/admin-x-framework/api/offers';
import {createOfferRedemptionsFilterUrl} from './offer-helpers';
import {useRouting} from '@tryghost/admin-x-framework/routing';

type RetentionCadence = 'month' | 'year';

type RetentionOffer = {
    id: string;
    name: string;
    description: string;
    terms: string | null; // e.g. "50% OFF" when active
    termsDetail: string | null; // e.g. "Next payment" when active
    redemptionOfferIds: string[];
    redemptions: number;
    status: 'active' | 'inactive';
};

const getActiveRetentionOfferByCadence = (offers: Offer[], cadence: RetentionCadence): Offer | null => {
    return offers.find((offer) => {
        return offer.redemption_type === 'retention' &&
            offer.cadence === cadence &&
            offer.status === 'active';
    }) || null;
};

const getRetentionRedemptionsByCadence = (offers: Offer[], cadence: RetentionCadence): number => {
    return offers.reduce((total, offer) => {
        if (offer.redemption_type !== 'retention' || offer.cadence !== cadence) {
            return total;
        }

        return total + (offer.redemption_count || 0);
    }, 0);
};

const getRetentionOfferIdsByCadence = (offers: Offer[], cadence: RetentionCadence): string[] => {
    return offers
        .filter((offer) => {
            return offer.redemption_type === 'retention' && offer.cadence === cadence;
        })
        .map(offer => offer.id);
};

const getRetentionTerms = (offer: Offer | null): string | null => {
    if (!offer) {
        return null;
    }

    if (offer.type === 'free_months') {
        const monthLabel = offer.amount === 1 ? 'month' : 'months';
        return `${offer.amount} ${monthLabel} free`;
    }

    if (offer.type === 'percent') {
        return `${offer.amount}% OFF`;
    }

    return null;
};

const getRetentionTermsDetail = (offer: Offer | null): string | null => {
    if (!offer) {
        return null;
    }

    if (offer.type === 'free_months') {
        return '';
    }

    if (offer.duration === 'once') {
        return 'First payment';
    }

    if (offer.duration === 'repeating' && offer.duration_in_months) {
        const monthLabel = offer.duration_in_months === 1 ? 'month' : 'months';
        return `For ${offer.duration_in_months} ${monthLabel}`;
    }

    if (offer.duration === 'forever') {
        return 'Forever';
    }

    return null;
};

const getRetentionOffers = (offers: Offer[]): RetentionOffer[] => {
    const monthlyOffer = getActiveRetentionOfferByCadence(offers, 'month');
    const yearlyOffer = getActiveRetentionOfferByCadence(offers, 'year');
    const monthlyOfferIds = getRetentionOfferIdsByCadence(offers, 'month');
    const yearlyOfferIds = getRetentionOfferIdsByCadence(offers, 'year');
    const monthlyRedemptions = getRetentionRedemptionsByCadence(offers, 'month');
    const yearlyRedemptions = getRetentionRedemptionsByCadence(offers, 'year');

    return [
        {
            id: 'monthly',
            name: 'Monthly retention',
            description: 'Applied to monthly plans',
            terms: getRetentionTerms(monthlyOffer),
            termsDetail: getRetentionTermsDetail(monthlyOffer),
            redemptionOfferIds: monthlyOfferIds,
            redemptions: monthlyRedemptions,
            status: monthlyOffer ? 'active' : 'inactive'
        },
        {
            id: 'yearly',
            name: 'Yearly retention',
            description: 'Applied to annual plans',
            terms: getRetentionTerms(yearlyOffer),
            termsDetail: getRetentionTermsDetail(yearlyOffer),
            redemptionOfferIds: yearlyOfferIds,
            redemptions: yearlyRedemptions,
            status: yearlyOffer ? 'active' : 'inactive'
        }
    ];
};

const OffersRetention: React.FC = () => {
    const {updateRoute} = useRouting();
    const {data: {offers: allOffers = []} = {}} = useBrowseOffers();
    const retentionOffers = getRetentionOffers(allOffers);

    const handleOfferEdit = (id: string) => {
        updateRoute(`offers/edit/retention/${id}`);
    };

    return (
        <div className='overflow-x-auto'>
            <table className='m-0 w-full table-fixed'>
                <colgroup>
                    <col />
                    <col className='w-[220px]' />
                    <col className='w-[220px]' />
                    <col className='w-[220px]' />
                    <col className='w-[80px]' />
                </colgroup>
                {retentionOffers.map((offer) => {
                    const redemptionFilterUrl = offer.redemptions > 0 && offer.redemptionOfferIds.length > 0
                        ? createOfferRedemptionsFilterUrl(offer.redemptionOfferIds)
                        : undefined;

                    return (
                        <tr key={offer.id} className='group relative scale-100 border-b border-b-grey-200 dark:border-grey-800' data-testid='retention-offer-item'>
                            <td className='p-0'>
                                <a className='block cursor-pointer p-5 pl-0' onClick={() => handleOfferEdit(offer.id)}>
                                    <span className='font-semibold'>{offer.name}</span><br />
                                    <span className='text-sm text-grey-700'>{offer.description}</span>
                                </a>
                            </td>
                            <td className='whitespace-nowrap p-0 text-sm'>
                                <a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer.id)}>
                                    {offer.terms ? (
                                        <>
                                            <span className='text-[1.3rem] font-medium uppercase'>{offer.terms}</span><br />
                                            <span className='text-grey-700'>{offer.termsDetail}</span>
                                        </>
                                    ) : (
                                        <span className='text-grey-700'>&ndash;</span>
                                    )}
                                </a>
                            </td>
                            <td className='whitespace-nowrap p-0 text-sm'>
                                <a
                                    className={`block cursor-pointer p-5 ${redemptionFilterUrl ? 'hover:underline' : ''}`}
                                    data-testid={`retention-redemptions-link-${offer.id}`}
                                    href={redemptionFilterUrl}
                                    onClick={!redemptionFilterUrl ? () => handleOfferEdit(offer.id) : undefined}
                                >
                                    {offer.redemptions}
                                </a>
                            </td>
                            <td className='whitespace-nowrap p-0 text-sm'>
                                <a className='block cursor-pointer p-5' onClick={() => handleOfferEdit(offer.id)}>
                                    {offer.status === 'active' ? (
                                        <span className='text-sm font-semibold text-green'>Active</span>
                                    ) : (
                                        <span className='text-sm text-grey-700'>Inactive</span>
                                    )}
                                </a>
                            </td>
                            <td className='w-[80px] p-0'></td>
                        </tr>
                    );
                })}
            </table>
        </div>
    );
};

export default OffersRetention;
