import Avatar from '../../../admin-x-ds/global/Avatar';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
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
            cancelLabel='Close'
            okLabel=''
            scrolling={true}
            size='md'
            stickyFooter={true}
            testId='history-modal'
            title='History'
        >
            <div className='-mb-8 mt-6'>
                <List
                    hint='End of history log'
                >
                    <ListItem
                        avatar={
                            <Avatar bgColor="green" label="DV" labelColor="white"/>
                        }
                        detail='09 Aug 2023'
                        title='Settings edited'
                        separator
                    />
                </List>
            </div>
        </Modal>
    );
});

export default HistoryModal;
