import AddOfferModal from './AddOfferModal';
import EditOfferModal from './EditOfferModal';
import NiceModal from '@ebay/nice-modal-react';
import {Button, Modal} from '@tryghost/admin-x-design-system';
import {OffersIndexModal} from './OffersIndex';
import {useRouting} from '@tryghost/admin-x-framework/routing';
import {useState} from 'react';

type OffersRouteHandlerProps = {
    route: string;
    setIsIndex: (value: boolean) => void;
};

const OffersRouteHandler : React.FC<OffersRouteHandlerProps> = ({route, setIsIndex}) => {
    if (route === 'offers/new') {
        setIsIndex(false);
        return <AddOfferModal />;
    } else if (route.startsWith('offers/edit/') && route.length > 'offers/edit/'.length) {
        const offerId = route.split('/').pop();
        setIsIndex(false);
        return <EditOfferModal id={offerId ? offerId : ''} />;
    } else {
        // Default case
        setIsIndex(true);
        return <OffersIndexModal />;
    }
};

const OffersContainerModal = () => {
    const {route, updateRoute} = useRouting();
    const [isIndex, setIsIndex] = useState<boolean>(true);
    return (
        <Modal
            afterClose={() => {
                updateRoute('offers');
            }}
            cancelLabel=''
            footer={
                isIndex && <div className='mx-8 flex w-full items-center justify-between'>
                    <a className='text-sm' href="https://ghost.org/help/offers" rel="noopener noreferrer" target="_blank">→ Learn about offers in Ghost</a>
                    <Button color='black' label='Close' onClick={() => {
                        updateRoute('offers');
                    }} />
                </div>
            }
            header={false}
            height='full'
            size='lg'
            stickyFooter= {isIndex}
            testId='offers-modal'
        >
            <OffersRouteHandler route={route} setIsIndex={setIsIndex} />
        </Modal>
    );
};

export default NiceModal.create(OffersContainerModal);
