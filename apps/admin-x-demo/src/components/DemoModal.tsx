import NiceModal from '@ebay/nice-modal-react';
import {Modal} from '@tryghost/admin-x-design-system';
import {useRouting} from '@tryghost/admin-x-framework/routing';

const DemoModal = NiceModal.create(() => {
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            title='About'
        >
            <div className='mt-3'>
                {`You're looking at a React app inside Admin. It uses common AdminX framework and Design System packages and works seamlessly with the current Admin's routing. At the moment the look and feel follows the current Admin's style to blend in with the existing pages. However the system is built in a very flexible way to allow easy updates in the future.`}
            </div>
        </Modal>
    );
});

export default DemoModal;
