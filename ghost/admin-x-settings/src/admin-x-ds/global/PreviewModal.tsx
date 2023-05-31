import ButtonGroup from './ButtonGroup';
import Heading from './Heading';
import Modal from './Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import {IButton} from './Button';

export interface PreviewModalProps {
    title?: string;
    sidebar?: React.ReactNode;
    preview?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okColor?: string;
    onCancel?: () => void;
    onOk?: () => void;
    customButtons?: React.ReactNode;
    customHeader?: React.ReactNode;
    sidebarPadding?: boolean;
}

const PreviewModal: React.FC<PreviewModalProps> = ({
    title, 
    sidebar, 
    preview, 
    cancelLabel = 'Cancel', 
    okLabel = 'OK', 
    okColor = 'black',
    onCancel, 
    onOk, 
    customButtons,
    customHeader,
    sidebarPadding = true
}) => {
    const modal = useModal();
    let buttons: IButton[] = [];

    if (!customButtons) {
        buttons.push({
            key: 'cancel-modal',
            label: cancelLabel,
            onClick: (onCancel ? onCancel : () => {
                modal.remove();
            })
        });

        buttons.push({
            key: 'ok-modal',
            label: okLabel, 
            color: okColor,
            className: 'min-w-[80px]',
            onClick: onOk
        });
    }

    return (
        <Modal 
            customFooter={(<></>)}
            noPadding={true}
            size='full'
            title=''
        >
            <div className='flex h-full grow'>
                <div className='flex grow flex-col'>
                    {preview}
                </div>
                <div className='flex h-full basis-[400px] flex-col gap-3 border-l border-grey-100'>
                    {customHeader ? customHeader : (
                        <div className='flex justify-between gap-3 px-7 pt-7'>
                            <>
                                <Heading className='mt-1' level={4}>{title}</Heading> 
                                {customButtons ? customButtons : <ButtonGroup buttons={buttons} /> }
                            </>
                        </div>
                    )}
                    <div className={`grow ${sidebarPadding && 'p-7'}`}>
                        {sidebar}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(PreviewModal);