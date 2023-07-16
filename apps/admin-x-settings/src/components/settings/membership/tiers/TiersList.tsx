import Button from '../../../../admin-x-ds/global/Button';
import Icon from '../../../../admin-x-ds/global/Icon';
import NiceModal from '@ebay/nice-modal-react';
import NoValueLabel from '../../../../admin-x-ds/global/NoValueLabel';
import React from 'react';
import TierDetailModal from './TierDetailModal';
import useRouting from '../../../../hooks/useRouting';
import {Tier} from '../../../../types/api';
import {currencyToDecimal, getSymbol} from '../../../../utils/currency';

interface TiersListProps {
    tab?: string;
    tiers: Tier[];
    updateTier: (data: Tier) => Promise<void>;
}

interface TierCardProps {
    tier: Tier;
    updateTier: (data: Tier) => Promise<void>;
}

const cardContainerClasses = 'group flex min-h-[200px] flex-col items-start justify-between gap-4 self-stretch rounded-sm border border-grey-300 p-4 transition-all hover:border-grey-400';

const TierCard: React.FC<TierCardProps> = ({
    tier,
    updateTier
}) => {
    const currency = tier?.currency || 'USD';
    const currencySymbol = currency ? getSymbol(currency) : '$';

    return (
        <div className={cardContainerClasses} data-testid='tier-card'>
            <div className='w-full grow cursor-pointer' onClick={() => {
                NiceModal.show(TierDetailModal, {tier});
            }}>
                <div className='text-[1.65rem] font-bold leading-tight tracking-tight text-pink'>{tier.name}</div>
                <div className='mt-2 flex items-baseline'>
                    <span className="ml-1 translate-y-[-3px] text-xl font-bold uppercase">{currencySymbol}</span>
                    <span className='text-2xl font-bold tracking-tighter'>{currencyToDecimal(tier.monthly_price || 0)}</span>
                    {(tier.monthly_price && tier.monthly_price > 0) && <span className='text-sm text-grey-700'>/month</span>}
                </div>
                <div className='mt-2 line-clamp-2 text-sm font-medium'>
                    {tier.description || <span className='opacity-50'>No description</span>}
                </div>
            </div>
            {tier.monthly_price && (
                tier.active ?
                    <Button className='group opacity-0 group-hover:opacity-100' color='red' label='Archive' link onClick={() => {
                        updateTier({...tier, active: false});
                    }}/>
                    :
                    <Button className='group opacity-0 group-hover:opacity-100' color='green' label='Activate' link onClick={() => {
                        updateTier({...tier, active: true});
                    }}/>
            )}
        </div>
    );
};

const TiersList: React.FC<TiersListProps> = ({
    tab,
    tiers,
    updateTier
}) => {
    const {updateRoute} = useRouting();
    const openTierModal = () => {
        updateRoute('tiers/add');
    };

    if (!tiers.length) {
        return (
            <NoValueLabel icon='money-bags'>
                No {tab === 'active-tiers' ? 'active' : 'archived'} tiers found.
            </NoValueLabel>
        );
    }

    return (
        <div className='mt-4 grid grid-cols-3 gap-4'>
            {tiers.map((tier) => {
                return <TierCard tier={tier} updateTier={updateTier} />;
            })}
            {tab === 'active-tiers' && (
                <button className={`${cardContainerClasses} group cursor-pointer`} type='button' onClick={() => {
                    openTierModal();
                }}>
                    <div className='flex h-full w-full flex-col items-center justify-center'>
                        <div className='flex flex-col items-center justify-center'>
                            <div className='translate-y-[15px] transition-all group-hover:translate-y-0'><Icon colorClass='text-green' name='add' /></div>
                            <div className='mt-2 translate-y-[-10px] text-sm font-semibold text-green opacity-0 transition-all group-hover:translate-y-0 group-hover:opacity-100'>Add tier</div>
                        </div>
                    </div>
                </button>
            )}
        </div>
    );
};

export default TiersList;
