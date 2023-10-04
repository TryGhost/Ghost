import ConfirmationModal, {ConfirmationModalProps} from '../admin-x-ds/global/modal/ConfirmationModal';
import NiceModal from '@ebay/nice-modal-react';

export function confirmIfDirty(dirty: boolean, action: () => void, options: Partial<ConfirmationModalProps> = {}) {
    if (!dirty) {
        action();
    } else {
        NiceModal.show(ConfirmationModal, {
            title: 'Are you sure you want to leave this page?',
            prompt: (
                <>
                    <p>{`Hey there! It looks like you didn't save the changes you made.`}</p>
                    <p>Save before you go!</p>
                </>
            ),
            okLabel: 'Leave',
            cancelLabel: 'Stay',
            okColor: 'red',
            onOk: (confirmationModal) => {
                action();
                confirmationModal?.remove();
            },
            ...options
        });
    }
}
