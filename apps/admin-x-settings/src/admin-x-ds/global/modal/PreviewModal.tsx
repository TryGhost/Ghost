import ButtonGroup from '../ButtonGroup';
import DesktopChrome from '../chrome/DesktopChrome';
import Heading, {HeadingLevel} from '../Heading';
import Icon from '../Icon';
import MobileChrome from '../chrome/MobileChrome';
import Modal, {ModalSize} from './Modal';
import NiceModal, {useModal} from '@ebay/nice-modal-react';
import React, {useEffect, useState} from 'react';
import Select, {SelectOption} from '../form/Select';
import TabView, {Tab} from '../TabView';
import clsx from 'clsx';
import useGlobalDirtyState from '../../../hooks/useGlobalDirtyState';
import {ButtonColor, ButtonProps} from '../Button';
import {confirmIfDirty} from '../../../utils/modals';

export interface PreviewModalProps {
    testId?: string;
    title?: string;
    titleHeadingLevel?: HeadingLevel;
    size?: ModalSize;
    sidebar?: boolean | React.ReactNode;
    preview?: React.ReactNode;
    dirty?: boolean
    cancelLabel?: string;
    okLabel?: string;
    okColor?: ButtonColor;
    buttonsDisabled?: boolean
    previewToolbar?: boolean;
    leftToolbar?: boolean;
    rightToolbar?: boolean;
    deviceSelector?: boolean;
    siteLink?: string;
    previewToolbarURLs?: SelectOption[];
    previewBgColor?: 'grey' | 'white' | 'greygradient';
    selectedURL?: string;
    previewToolbarTabs?: Tab[];
    defaultTab?: string;
    sidebarButtons?: React.ReactNode;
    sidebarHeader?: React.ReactNode;
    sidebarPadding?: boolean;
    sidebarContentClasses?: string;
    enableCMDS?: boolean;

    onCancel?: () => void;
    onOk?: () => void;
    afterClose?: () => void;
    onSelectURL?: (url: string) => void;
    onSelectDesktopView?: () => void;
    onSelectMobileView?: () => void;
}

export const PreviewModalContent: React.FC<PreviewModalProps> = ({
    testId,
    title,
    titleHeadingLevel = 4,
    size = 'full',
    sidebar = '',
    preview,
    dirty = false,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okColor = 'black',
    previewToolbar = true,
    leftToolbar = true,
    rightToolbar = true,
    deviceSelector = true,
    siteLink,
    previewToolbarURLs,
    previewBgColor = 'grey',
    selectedURL,
    previewToolbarTabs,
    buttonsDisabled,
    sidebarButtons,
    sidebarHeader,
    sidebarPadding = true,
    sidebarContentClasses,
    enableCMDS = true,

    onCancel,
    onOk,
    afterClose,
    onSelectURL,
    onSelectDesktopView,
    onSelectMobileView
}) => {
    const modal = useModal();
    const {setGlobalDirtyState} = useGlobalDirtyState();

    useEffect(() => {
        setGlobalDirtyState(dirty);
    }, [dirty, setGlobalDirtyState]);

    useEffect(() => {
        if (onOk) {
            const handleCMDS = (e: KeyboardEvent) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 's') {
                    e.preventDefault();
                    onOk();
                }
            };
            if (enableCMDS) {
                window.addEventListener('keydown', handleCMDS);
                return () => {
                    window.removeEventListener('keydown', handleCMDS);
                };
            }
        }
    });

    const [view, setView] = useState('desktop');

    if (view === 'mobile' && deviceSelector) {
        preview = (
            <MobileChrome data-testid="preview-mobile">
                {preview}
            </MobileChrome>
        );
    } else if (view === 'desktop' && deviceSelector) {
        preview = (
            <DesktopChrome data-testid="preview-desktop">
                {preview}
            </DesktopChrome>
        );
    }

    if (previewToolbar) {
        let toolbarLeft = (<></>);
        if (previewToolbarURLs) {
            toolbarLeft = (
                <Select
                    options={previewToolbarURLs!}
                    selectedOption={previewToolbarURLs!.find(option => option.value === selectedURL)}
                    onSelect={option => option && onSelectURL?.(option.value)}
                />
            );
        } else if (previewToolbarTabs) {
            toolbarLeft = <TabView
                border={false}
                selectedTab={selectedURL}
                tabs={previewToolbarTabs}
                width='wide'
                onTabChange={onSelectURL!}
            />;
        }

        const selectedIconColorClass = 'text-black dark:text-green';
        const unSelectedIconColorClass = 'text-grey-500 dark:text-grey-600';
        const rightButtons:ButtonProps[] = [
            {
                icon: 'laptop',
                label: 'Desktop',
                hideLabel: true,
                link: true,
                size: 'sm',
                iconColorClass: (view === 'desktop' ? selectedIconColorClass : unSelectedIconColorClass),
                onClick: onSelectDesktopView || (() => {
                    setView('desktop');
                })
            },
            {
                icon: 'mobile',
                label: 'Mobile',
                hideLabel: true,
                link: true,
                size: 'sm',
                iconColorClass: (view === 'mobile' ? selectedIconColorClass : unSelectedIconColorClass),
                onClick: onSelectMobileView || (() => {
                    setView('mobile');
                })
            }
        ];

        const toolbarRight = deviceSelector && (
            <ButtonGroup
                buttons={rightButtons}
            />
        );

        let previewBgClass = '';
        if (previewBgColor === 'grey') {
            previewBgClass = 'bg-grey-50 dark:bg-black';
        } else if (previewBgColor === 'greygradient') {
            previewBgClass = 'bg-gradient-to-tr from-white to-[#f9f9fa] dark:from-grey-950 dark:to-black';
        }

        const containerClasses = clsx(
            'min-w-100 absolute inset-y-0 left-0 right-[400px] flex grow flex-col overflow-y-auto',
            previewBgClass
        );

        let viewSiteButton;
        if (siteLink) {
            viewSiteButton = (
                <div className='ml-3 border-l border-grey-400 dark:border-grey-800'>
                    <a className='ml-3 flex items-center gap-1 text-sm' href={siteLink} rel="noopener noreferrer" target="_blank">View site <Icon name='arrow-top-right' size='xs' /></a>
                </div>
            );
        }

        preview = (
            <div className={containerClasses}>
                {previewToolbar && <header className="relative flex h-[74px] shrink-0 items-center justify-center px-3 py-5" data-testid="design-toolbar">
                    {leftToolbar && <div className='absolute left-5 flex h-full items-center'>
                        {toolbarLeft}
                    </div>}
                    {rightToolbar && <div className='absolute right-5 flex h-full items-center'>
                        {toolbarRight}
                        {viewSiteButton}
                    </div>}
                </header>}
                <div className='flex grow items-center justify-center text-sm text-grey-400'>
                    {preview}
                </div>
            </div>
        );
    }

    let buttons: ButtonProps[] = [];

    if (!sidebarButtons) {
        buttons.push({
            key: 'cancel-modal',
            label: cancelLabel,
            onClick: (onCancel ? onCancel : () => {
                confirmIfDirty(dirty, () => {
                    modal.remove();
                    afterClose?.();
                });
            }),
            disabled: buttonsDisabled
        });

        buttons.push({
            key: 'ok-modal',
            label: okLabel,
            color: okColor,
            onClick: onOk,
            disabled: buttonsDisabled
        });
    }

    return (
        <Modal
            afterClose={afterClose}
            animate={false}
            footer={false}
            padding={false}
            size={size}
            testId={testId}
            title=''
            hideXOnMobile
        >
            <div className='flex h-full grow'>
                <div className={`hidden grow flex-col md:!visible md:!flex ${previewBgColor === 'grey' ? 'bg-grey-50' : 'bg-white'}`}>
                    {preview}
                </div>
                {sidebar &&
                    <div className='relative flex h-full w-full flex-col border-l border-grey-100 dark:border-grey-900 md:w-auto md:basis-[400px]'>
                        {sidebarHeader ? sidebarHeader : (
                            <div className='flex max-h-[74px] items-center justify-between gap-3 px-7 py-5'>
                                <Heading level={titleHeadingLevel}>{title}</Heading>
                                {sidebarButtons ? sidebarButtons : <ButtonGroup buttons={buttons} /> }
                            </div>
                        )}
                        <div className={`${!sidebarHeader ? 'absolute inset-x-0 bottom-0 top-[74px] grow' : ''} ${sidebarPadding && 'p-7 pt-0'} flex flex-col justify-between overflow-y-auto ${sidebarContentClasses && sidebarContentClasses}`}>
                            {sidebar}
                        </div>
                    </div>
                }
            </div>
        </Modal>
    );
};

export default NiceModal.create(PreviewModalContent);
