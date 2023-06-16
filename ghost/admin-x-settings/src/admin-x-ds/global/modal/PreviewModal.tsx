import ButtonGroup from '../ButtonGroup';
import DesktopChromeHeader from '../chrome/DesktopChromeHeader';
import Heading from '../Heading';
import MobileChrome from '../chrome/MobileChrome';
import Modal, {ModalSize} from './Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useState} from 'react';
import Select, {SelectOption} from '../form/Select';
import TabView, {Tab} from '../TabView';
import {ButtonProps} from '../Button';

export interface PreviewModalProps {
    testId?: string;
    title?: string;
    size?: ModalSize;
    sidebar?: boolean | React.ReactNode;
    preview?: React.ReactNode;
    cancelLabel?: string;
    okLabel?: string;
    okColor?: string;
    buttonsDisabled?: boolean
    previewToolbar?: boolean;
    previewToolbarURLs?: SelectOption[];
    selectedURL?: string;
    previewToolbarTabs?: Tab[];
    defaultTab?: string;
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
    testId,
    title,
    size = 'full',
    sidebar = '',
    preview,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okColor = 'black',
    previewToolbar = true,
    previewToolbarURLs,
    selectedURL,
    previewToolbarTabs,
    defaultTab,
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
    let buttons: ButtonProps[] = [];

    const [view, setView] = useState('desktop');

    if (view === 'mobile') {
        preview = (
            <MobileChrome>
                {preview}
            </MobileChrome>
        );
    }

    if (previewToolbar) {
        let toolbarLeft = (<></>);
        if (previewToolbarURLs) {
            toolbarLeft = (
                <Select defaultSelectedOption={selectedURL} options={previewToolbarURLs!} onSelect={onSelectURL ? onSelectURL : () => {}} />
            );
        } else if (previewToolbarTabs) {
            toolbarLeft = <TabView
                border={false}
                defaultSelected={defaultTab}
                tabs={previewToolbarTabs}
                width='wide'
                onTabChange={onSelectURL}
            />;
        }

        const unSelectedIconColorClass = 'text-grey-500';
        const toolbarRight = (
            <ButtonGroup
                buttons={[
                    {
                        icon: 'laptop',
                        link: true,
                        size: 'sm',
                        iconColorClass: (view === 'desktop' ? 'text-black' : unSelectedIconColorClass),
                        onClick: onSelectDesktopView || (() => {
                            setView('desktop');
                        })
                    },
                    {
                        icon: 'mobile',
                        link: true,
                        size: 'sm',
                        iconColorClass: (view === 'mobile' ? 'text-black' : unSelectedIconColorClass),
                        onClick: onSelectMobileView || (() => {
                            setView('mobile');
                        })
                    }
                ]}
            />
        );

        preview = (
            <>
                <DesktopChromeHeader
                    size='lg'
                    toolbarCenter={<></>}
                    toolbarLeft={toolbarLeft}
                    toolbarRight={toolbarRight}
                />
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
            footer={false}
            noPadding={true}
            size={size}
            testId={testId}
            title=''
        >
            <div className='flex h-full grow'>
                <div className='flex grow flex-col'>
                    {preview}
                </div>
                {sidebar &&
                    <div className='flex h-full basis-[400px] flex-col border-l border-grey-100'>
                        {sidebarHeader ? sidebarHeader : (
                            <div className='flex max-h-[74px] items-start justify-between gap-3 px-7 py-5'>
                                <Heading className='mt-1' level={4}>{title}</Heading>
                                {sidebarButtons ? sidebarButtons : <ButtonGroup buttons={buttons} /> }
                            </div>
                        )}
                        <div className={`grow ${sidebarPadding && 'p-7 pt-0'} flex flex-col justify-between overflow-y-auto`}>
                            {sidebar}
                        </div>
                    </div>
                }
            </div>
        </Modal>
    );
};

export default NiceModal.create(PreviewModalContent);
