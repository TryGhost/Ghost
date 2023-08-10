import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import useRouting from '../../../hooks/useRouting';

const HistoryModal = NiceModal.create(() => {
    // const modal = useModal();
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('history');
            }}
            scrolling={true}
            size='md'
            stickyFooter={true}
            testId='history-modal'
            title='History'
        >
            <div className='-mb-8 mt-6'>
                Full history
            </div>
        </Modal>
    );
});

export default HistoryModal;
