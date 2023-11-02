import Button from '../../../../admin-x-ds/global/Button';
import Modal from '../../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import TabView, {Tab} from '../../../../admin-x-ds/global/TabView';
import useFeatureFlag from '../../../../hooks/useFeatureFlag';
import useRouting from '../../../../hooks/useRouting';
import {useEffect} from 'react';

export type OfferType = 'percent' | 'fixed' | 'trial';

const OfferCard: React.FC<{name: string, type: OfferType, onClick: ()=>void}> = ({name, type, onClick}) => {
    let discountColor = '';

    switch (type) {
    case 'percent':
        discountColor = 'text-green';
        break;
    case 'fixed':
        discountColor = 'text-blue';
        break;
    case 'trial':
        discountColor = 'text-pink';
        break;
    default:
        break;
    }

    return <div className='flex flex-col items-center gap-6 border border-transparent bg-grey-100 p-5 text-center transition-all hover:border-grey-100 hover:bg-grey-75 hover:shadow-sm dark:bg-grey-950 dark:hover:border-grey-800'>
        <h2 className='cursor-pointer text-[1.6rem]' onClick={onClick}>{name}</h2>
        <div className=''>
            <div className='flex gap-3 text-sm uppercase leading-none'>
                <span className={`font-semibold ${discountColor}`}>10% off</span>
                <span className='text-grey-700 line-through'>$5</span>
            </div>
            <span className='text-3xl font-bold'>$4</span>
        </div>
        <div className='flex flex-col items-center text-xs'>
            <span className='font-medium'>Bronze monthly — First payment</span>
            <a className='text-grey-700 hover:underline' href="/ghost/#/members">4 redemptions</a>
        </div>
    </div>;
};

const OffersModal = () => {
    const modal = useModal();
    const {updateRoute} = useRouting();
    const hasOffers = useFeatureFlag('adminXOffers');

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

    const handleOfferEdit = (id:string) => {
        // TODO: implement
        modal.remove();
        updateRoute(`offers/${id}`);
    };

    return <Modal cancelLabel='' header={false} size='lg' onOk={() => {
        modal.remove();
        updateRoute('offers');
    }}>
        <div className='pt-6'>
            <header>
                <div className='flex items-center justify-between'>
                    <TabView
                        border={false}
                        selectedTab='active'
                        tabs={offersTabs}
                        width='wide'
                        onTabChange={() => {}}
                    />
                    <Button color='green' icon='add' iconColorClass='green' label='New offer' link={true} size='sm' onClick={() => updateRoute('offers/new')} />
                </div>
                <h1 className='mt-12 border-b border-b-grey-300 pb-2.5 text-3xl'>Active offers</h1>
            </header>
            <div className='mt-8 grid grid-cols-3 gap-6'>
                <OfferCard name='Black friday' type='percent' onClick={() => handleOfferEdit('123')} />
                <OfferCard name='Buy this right now' type='fixed' onClick={() => handleOfferEdit('123')} />
                <OfferCard name='Desperate Sale!' type='trial' onClick={() => handleOfferEdit('123')} />
            </div>
            <a className='absolute bottom-10 text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
        </div>
    </Modal>;
};

export default NiceModal.create(OffersModal);
