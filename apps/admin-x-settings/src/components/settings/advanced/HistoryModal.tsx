import Avatar from '../../../admin-x-ds/global/Avatar';
import Button from '../../../admin-x-ds/global/Button';
import Icon from '../../../admin-x-ds/global/Icon';
import List from '../../../admin-x-ds/global/List';
import ListItem from '../../../admin-x-ds/global/ListItem';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import Popover from '../../../admin-x-ds/global/Popover';
import Toggle from '../../../admin-x-ds/global/form/Toggle';
import ToggleGroup from '../../../admin-x-ds/global/form/ToggleGroup';
import useRouting from '../../../hooks/useRouting';
import {generateAvatarColor, getInitials} from '../../../utils/helpers';

interface HistoryAvatarProps {
    name?: string;
    email: string;
    profileImage?: string;
    iconName: string;
}

const HistoryAvatar: React.FC<HistoryAvatarProps> = ({
    name,
    email,
    profileImage,
    iconName
}) => {
    return (
        <div className='relative'>
            <Avatar bgColor={generateAvatarColor((name ? name : email))} image={profileImage} label={getInitials(name)} labelColor='white' size='md' />
            <div className='absolute -bottom-1 -right-1 flex items-center justify-center rounded-full border border-grey-100 bg-white p-1 shadow-sm'>
                <Icon name={iconName} size='xs' />
            </div>
        </div>
    );
};

const HistoryFilter: React.FC = () => {
    return (
        <Popover trigger={<Button label='Filter' link />}>
            <div className='flex w-[220px] flex-col gap-8 p-5'>
                <ToggleGroup>
                    <Toggle direction='rtl' label='Added' labelClasses='text-sm' />
                    <Toggle direction='rtl' label='Edited' labelClasses='text-sm' />
                    <Toggle direction='rtl' label='Deleted' labelClasses='text-sm' />
                </ToggleGroup>
                <ToggleGroup>
                    <Toggle direction='rtl' label='Posts' labelClasses='text-sm' />
                    <Toggle direction='rtl' label='Pages' labelClasses='text-sm' />
                    <Toggle direction='rtl' label='Tags' labelClasses='text-sm' />
                    <Toggle direction='rtl' label='Tiers & offers' labelClasses='text-sm' />
                    <Toggle direction='rtl' label='Settings & staff' labelClasses='text-sm' />
                </ToggleGroup>
            </div>
        </Popover>
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
            topRightContent={<HistoryFilter />}
            onOk={() => {
                modal.remove();
                updateRoute('history');
            }}
        >
            <div className='-mb-8 mt-6'>
                <List hint='End of history log'>
                    <ListItem
                        avatar={
                            <HistoryAvatar
                                email='jono@ghost.org'
                                iconName='pen'
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
