import Icon from '../../../admin-x-ds/global/Icon';
import Modal from '../../../admin-x-ds/global/modal/Modal';
import NiceModal from '@ebay/nice-modal-react';
import Separator from '../../../admin-x-ds/global/Separator';
import useRouting from '../../../hooks/useRouting';
import {ReactComponent as GhostLogo} from '../../../admin-x-ds/assets/images/ghost-logo.svg';
import {RoutingModalProps} from '../../providers/RoutingProvider';

const AboutModal = NiceModal.create<RoutingModalProps>(({}) => {
    const {updateRoute} = useRouting();

    return (
        <Modal
            afterClose={() => {
                updateRoute('');
            }}
            cancelLabel=''
            footer={(<></>)}
            size={540}
            topRightContent='close'
        >
            <div className='flex flex-col gap-4 pb-7 text-sm'>
                <GhostLogo className="h-auto w-[120px] dark:invert"/>
                <div className='mt-3 flex flex-col gap-1.5'>
                    <div><strong>Version:</strong> 5.67.0+moya</div>
                    <div><strong>Developer experiments:</strong> Enabled</div>

                </div>
                <Separator />
                <div className='flex flex-col gap-1.5'>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://ghost.org/docs/" rel="noopener noreferrer" target="_blank"><Icon name='book-open' size='sm' /> User documentation</a>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://forum.ghost.org/" rel="noopener noreferrer" target="_blank"><Icon name='question-circle' size='sm' /> Get help with Ghost</a>
                    <a className='flex items-center gap-2 hover:text-grey-900 dark:hover:text-grey-400' href="https://ghost.org/docs/contributing/" rel="noopener noreferrer" target="_blank"><Icon name='angle-brackets' size='sm' /> Get involved</a>
                </div>
                <Separator />
                <p className='max-w-[460px] text-xs'>
                    Copyright © 2013 &ndash; 2023 Ghost Foundation, released under the <a className='text-green' href="https://github.com/TryGhost/Ghost/blob/main/LICENSE" rel="noopener noreferrer" target="_blank">MIT license</a>. <a className='text-green' href="https://ghost.org/" rel="noopener noreferrer" target="_blank">Ghost</a> is a registered trademark of <a className='text-green' href="https://ghost.org/trademark/" rel="noopener noreferrer" target="_blank">Ghost Foundation Ltd</a>.
                </p>
            </div>
        </Modal>
    );
});

export default AboutModal;