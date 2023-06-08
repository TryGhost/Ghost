import ButtonGroup from './ButtonGroup';
import DesktopChromeHeader from './DesktopChromeHeader';
import Heading from './Heading';
import Modal from './Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React from 'react';
import URLSelect from './URLSelect';
import {IButton} from './Button';
import {SelectOption} from './Select';

export interface PreviewModalProps {
    title?: string;
    sidebar?: React.ReactNode;
    preview?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okColor?: string;
    buttonsDisabled?: boolean
    previewToolbar?: boolean;
    previewToolbarURLs?: SelectOption[];
    sidebarButtons?: React.ReactNode;
    sidebarHeader?: React.ReactNode;
    sidebarPadding?: boolean;

    onCancel?: () => void;
    onOk?: () => void;
    onSelectURL?: (url: string) => void;
    onSelectDesktopView?: () => void;
    onSelectMobileView?: () => void;
}

export const PreviewModalContent: React.FC<PreviewModalProps> = ({
    title,
    sidebar,
    preview,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okColor = 'black',
    previewToolbarURLs,
    previewToolbar = true,
    buttonsDisabled,
    sidebarButtons,
    sidebarHeader,
    sidebarPadding = true,

    onCancel,
    onOk,
    onSelectURL,
    onSelectDesktopView,
    onSelectMobileView
}) => {
    const modal = useModal();
    let buttons: IButton[] = [];

    if (previewToolbar) {
        let toolbarCenter = (<></>);
        if (previewToolbarURLs) {
            toolbarCenter = (
                <URLSelect options={previewToolbarURLs!} onSelect={onSelectURL ? onSelectURL : () => {}} />
            );
        }

        const toolbarRight = (
            <ButtonGroup
                buttons={[
                    {
                        icon: 'laptop',
                        link: true,
                        size: 'sm',
                        onClick: onSelectDesktopView
                    },
                    {
                        icon: 'mobile',
                        link: true,
                        size: 'sm',
                        iconColorClass: 'text-grey-500',
                        onClick: onSelectMobileView
                    }
                ]}
            />
        );

        preview = (
            <>
                <div className='bg-grey-50 p-2 pl-3'>
                    <DesktopChromeHeader
                        toolbarCenter={toolbarCenter}
                        toolbarRight={toolbarRight}
                    />
                </div>
                <div className='flex h-full grow items-center justify-center bg-grey-50 text-sm text-grey-400'>
                    {preview}
                </div>
            </>
        );
    }

    if (!sidebarButtons) {
        buttons.push({
            key: 'cancel-modal',
            label: cancelLabel,
            onClick: (onCancel ? onCancel : () => {
                modal.remove();
            }),
            disabled: buttonsDisabled
        });

        buttons.push({
            key: 'ok-modal',
            label: okLabel,
            color: okColor,
            className: 'min-w-[80px]',
            onClick: onOk,
            disabled: buttonsDisabled
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
                    {sidebarHeader ? sidebarHeader : (
                        <div className='flex justify-between gap-3 px-7 pt-5'>
                            <>
                                <Heading className='mt-1' level={4}>{title}</Heading>
                                {sidebarButtons ? sidebarButtons : <ButtonGroup buttons={buttons} /> }
                            </>
                        </div>
                    )}
                    <div className={`grow ${sidebarPadding && 'p-7'} flex flex-col justify-between overflow-y-auto`}>
                        {sidebar}
                    </div>
                </div>
            </div>
        </Modal>
    );
};

export default NiceModal.create(PreviewModalContent);
