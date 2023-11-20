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
            title='Demo modal'
        >
            Demo modal
        </Modal>
    );
});

export default DemoModal;
