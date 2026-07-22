import NiceModal, {useModal} from '@ebay/nice-modal-react';
import clsx from 'clsx';
import React, {useEffect} from 'react';
import Icon from '../icon';
import Modal, {ModalSize} from './modal';
import {Button, type ButtonProps} from '@tryghost/shade/components';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {Inline, Text, type TextElement, type TextLeading, type TextSize} from '@tryghost/shade/primitives';
import {useGlobalDirtyState} from '@tryghost/shade/utils';

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

const headingSizes: Record<HeadingLevel, TextSize> = {
    1: '3xl',
    2: '2xl',
    3: 'xl',
    4: 'lg',
    5: 'md',
    6: 'md'
};

const headingClasses: Record<HeadingLevel, string> = {
    1: 'text-4xl',
    2: 'md:text-3xl',
    3: 'md:text-2xl',
    4: 'md:text-xl',
    5: 'md:text-lg',
    6: 'text-base'
};

const headingLeading: Record<HeadingLevel, TextLeading> = {
    1: 'supertight',
    2: 'heading',
    3: 'heading',
    4: 'heading',
    5: 'supertight',
    6: 'body'
};

export interface PreviewModalProps {
    testId?: string;
    title?: string;
    titleHeadingLevel?: HeadingLevel;
    size?: ModalSize;
    width?: 'full' | number;
    height?: 'full' | number;
    sidebar?: boolean | React.ReactNode;
    preview?: React.ReactNode;
    dirty?: boolean
    cancelLabel?: string;
    okLabel?: string;
    okVariant?: ButtonProps['variant'];
    buttonsDisabled?: boolean
    previewToolbar?: boolean;
    leftToolbar?: boolean;
    rightToolbar?: boolean;
    deviceSelector?: React.ReactNode;
    siteLink?: string;
    previewToolbarURLs?: React.ReactNode;
    previewToolbarBreadcrumbs?: React.ReactNode;
    previewBgColor?: 'grey' | 'white' | 'greygradient';
    previewToolbarTabs?: React.ReactNode;
    sidebarButtons?: React.ReactNode;
    sidebarHeader?: React.ReactNode;
    sidebarPadding?: boolean;
    sidebarContentClasses?: string;
    enableCMDS?: boolean;
    backDropClick?: boolean;

    onCancel?: () => void;
    onOk?: () => void;
    afterClose?: () => void;
}

export const PreviewModalContent: React.FC<PreviewModalProps> = ({
    testId,
    title,
    titleHeadingLevel = 4,
    size = 'full',
    width,
    height,
    sidebar = '',
    preview,
    dirty = false,
    cancelLabel = 'Cancel',
    okLabel = 'OK',
    okVariant = 'default',
    previewToolbar = true,
    leftToolbar = true,
    rightToolbar = true,
    deviceSelector,
    siteLink,
    previewToolbarURLs,
    previewBgColor = 'grey',
    previewToolbarTabs,
    previewToolbarBreadcrumbs,
    buttonsDisabled,
    sidebarButtons,
    sidebarHeader,
    sidebarPadding = true,
    sidebarContentClasses,
    enableCMDS = true,
    backDropClick,

    onCancel,
    onOk,
    afterClose
}) => {
    const modal = useModal();
    const {setGlobalDirtyState} = useGlobalDirtyState();
    const {confirm, dialogProps} = useDirtyConfirmation();

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

    if (previewToolbar) {
        let toolbarLeft: React.ReactNode = (<></>);
        if (previewToolbarURLs) {
            toolbarLeft = previewToolbarURLs;
        } else if (previewToolbarTabs) {
            toolbarLeft = previewToolbarTabs;
        } else if (previewToolbarBreadcrumbs) {
            toolbarLeft = previewToolbarBreadcrumbs;
        }

        let previewBgClass = '';
        if (previewBgColor === 'grey') {
            previewBgClass = 'bg-grey-50 dark:bg-black';
        } else if (previewBgColor === 'greygradient') {
            previewBgClass = 'bg-gradient-to-tr from-white to-[#f9f9fa] dark:from-grey-950 dark:to-black';
        }

        const containerClasses = clsx(
            'absolute inset-y-0 right-[400px] left-0 flex w-full min-w-100 grow flex-col overflow-y-auto',
            previewBgClass
        );

        let viewSiteButton;
        if (siteLink) {
            viewSiteButton = (
                <div className='ml-3 border-l border-grey-400 dark:border-grey-800'>
                    <a className='ml-3 flex items-center gap-1' href={siteLink} rel="noopener noreferrer" target="_blank">View site <Icon name='arrow-top-right' size='xs' /></a>
                </div>
            );
        }

        preview = (
            <div className={containerClasses}>
                {previewToolbar && <header className="relative flex h-[80px] shrink-0 items-center justify-center px-8 py-5" data-testid="design-toolbar">
                    {leftToolbar && <div className='absolute left-8 flex h-full items-center'>
                        {toolbarLeft}
                    </div>}
                    {rightToolbar && <div className='absolute right-8 flex h-full items-center'>
                        {deviceSelector}
                        {viewSiteButton}
                    </div>}
                </header>}
                <div className='flex grow items-center justify-center text-grey-400'>
                    {preview}
                </div>
            </div>
        );
    }

    const handleCancel = onCancel || (() => {
        confirm(dirty, () => {
            modal.remove();
            afterClose?.();
        });
    });

    return (
        <Modal
            afterClose={afterClose}
            animate={false}
            backDropClick={backDropClick}
            dirty={dirty}
            footer={false}
            height={height}
            padding={false}
            size={size}
            testId={testId}
            title=''
            width={width}
            hideXOnMobile
        >
            <div className='flex h-full grow'>
                <div className={`relative hidden grow flex-col [@media(min-width:801px)]:!visible [@media(min-width:801px)]:!flex ${previewBgColor === 'grey' ? 'bg-grey-50' : 'bg-white dark:bg-black'}`}>
                    {preview}
                </div>
                {sidebar &&
                    <div className='relative flex size-full flex-col border-l border-grey-100 dark:border-grey-900 [@media(min-width:801px)]:w-auto [@media(min-width:801px)]:basis-[400px]'>
                        {sidebarHeader ? sidebarHeader : (
                            <div className='flex max-h-[82px] items-center justify-between gap-3 px-7 py-6'>
                                <Text
                                    as={`h${titleHeadingLevel}` as TextElement}
                                    className={headingClasses[titleHeadingLevel]}
                                    leading={headingLeading[titleHeadingLevel]}
                                    size={headingSizes[titleHeadingLevel]}
                                    tone={titleHeadingLevel === 6 ? 'secondary' : 'primary'}
                                    weight={titleHeadingLevel === 6 ? 'semibold' : 'bold'}
                                >
                                    {title}
                                </Text>
                                {sidebarButtons || (
                                    <Inline gap='md'>
                                        <Button className='font-semibold' disabled={buttonsDisabled} type='button' variant='ghost' onClick={handleCancel}>{cancelLabel}</Button>
                                        <Button disabled={buttonsDisabled} type='button' variant={okVariant} onClick={onOk}>{okLabel}</Button>
                                    </Inline>
                                )}
                            </div>
                        )}
                        <div className={`${!sidebarHeader ? 'absolute inset-x-0 top-[80px] bottom-0 grow' : ''} ${sidebarPadding && 'p-7 pt-0'} flex flex-col justify-between overflow-y-auto ${sidebarContentClasses && sidebarContentClasses}`}>
                            {sidebar}
                        </div>
                    </div>
                }
            </div>
            <DirtyConfirmDialog {...dialogProps} />
        </Modal>
    );
};

export default NiceModal.create(PreviewModalContent);
