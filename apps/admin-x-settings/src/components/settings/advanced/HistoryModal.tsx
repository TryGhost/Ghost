import Avatar from '../../../admin-x-ds/global/Avatar';
import Icon from '../../../admin-x-ds/global/Icon';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import useRouting from '../../../hooks/useRouting';
import {generateAvatarColor, getInitials} from '../../../utils/helpers';

interface HistoryAvatarProps {
    name?: string;
    email: string;
    profileImage?: string;
}

const HistoryAvatar: React.FC<HistoryAvatarProps> = ({
    name,
    email,
    profileImage
}) => {
    return (
        <div className='relative'>
            <Avatar bgColor={generateAvatarColor((name ? name : email))} image={profileImage} label={getInitials(name)} labelColor='white' size='md' />
            <div className='absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-grey-100 bg-white p-1 shadow-sm'>
                <Icon name='pen' size='xs' />
            </div>
        </div>
    );
};

const HistoryModal = NiceModal.create(() => {
    const modal = useModal();
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('history');
            }}
            cancelLabel=''
            okLabel='Close'
            scrolling={true}
            size='md'
            stickyFooter={true}
            testId='history-modal'
            title='History'
            onOk={() => {
                modal.remove();
                updateRoute('history');
            }}
        >
            <div className='-mb-8 mt-6'>
                <List
                    hint='End of history log'
                >
                    <ListItem
                        avatar={
                            // <Avatar bgColor="green" label="DV" labelColor="white"/>
                            <HistoryAvatar
                                email='jono@ghost.org'
                                name='Jono'
                            />
                        }
                        detail='09 Aug 2023 | 15:40:22'
                        title={
                            <div className='text-sm'>
                                <span>Settings edited: Members</span>
                                <span className='text-xs'><code className='mb-1 bg-white text-grey-800'>(stripe_connect_publishable_key)</code> </span>
                                <span>&mdash; by Jono</span>
                            </div>
                        }
                        separator
                    />
                </List>
            </div>
        </Modal>
    );
});

export default HistoryModal;
