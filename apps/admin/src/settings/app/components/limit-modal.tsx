import NiceModal from '@ebay/nice-modal-react';
import React from 'react';

import {ConfirmationModalContent} from './confirmation-modal';

export interface LimitModalProps {
    title?: string;
    prompt?: React.ReactNode;
    okLabel?: string;
    formSheet?: boolean;
    onOk?: (modal?: {
        remove: () => void;
    }) => void | Promise<void>;
}

export const LimitModalContent: React.FC<LimitModalProps> = ({
    title = 'Upgrade your plan',
    prompt,
    okLabel = 'Upgrade',
    formSheet = false,
    onOk
}) => {
    const promptContent = typeof prompt === 'string' && prompt.includes('<') ? (
        <div dangerouslySetInnerHTML={{__html: prompt}} />
    ) : prompt;

    return (
        <ConfirmationModalContent
            formSheet={formSheet}
            okLabel={okLabel}
            prompt={<div className='w-full'>{promptContent}</div>}
            testId='limit-modal'
            title={title}
            onOk={onOk}
        />
    );
};

export default NiceModal.create(LimitModalContent);
