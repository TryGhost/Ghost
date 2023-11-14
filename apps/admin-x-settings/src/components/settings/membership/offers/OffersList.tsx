import {Button, Tab, TabView} from '@tryghost/admin-x-design-system';
import {OfferCardProps} from './OffersModal';
import {getPaidActiveTiers, useBrowseTiers} from '../../../../api/tiers';
import {useBrowseOffers} from '../../../../api/offers';
import {useState} from 'react';

export type OfferType = 'percent' | 'fixed' | 'trial';

export const OffersList: React.FC<{ OfferCard: React.ComponentType<OfferCardProps>, ToggleViewState: (state: 'list' | 'add' | 'edit') => void, SelectOffer: (id: string) => void }> = ({OfferCard, ToggleViewState, SelectOffer}) => {
    let offersTabs: Tab[] = [
        {id: 'active', title: 'Active'},
        {id: 'archived', title: 'Archived'}
    ];
    const [selectedTab, setSelectedTab] = useState('active');

    const {data: {offers: allOffers = []} = {}} = useBrowseOffers({
        searchParams: {
            limit: 'all'
        }
    });
    const {data: {tiers: allTiers} = {}} = useBrowseTiers();
    const paidActiveTiers = getPaidActiveTiers(allTiers || []);

    return (
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
                    <Button color='green' icon='add' iconColorClass='green' label='New offer' link={true} size='sm' onClick={() => {
                        ToggleViewState('add');
                    }} />
                </div>
                <h1 className='mt-12 border-b border-b-grey-300 pb-2.5 text-3xl'>{offersTabs.find(tab => tab.id === selectedTab)?.title} offers</h1>
            </header>
            <div className='mt-8 grid grid-cols-3 gap-6'>
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
                            onClick={() => {
                                SelectOffer(offer?.id);
                                ToggleViewState('edit');
                            }}
                        />
                    );
                })}
            </div>
        </div>
    );
};