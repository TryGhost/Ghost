import React, {useEffect} from 'react';
import {ExternalLink} from 'lucide-react';
import {useModal} from '@ebay/nice-modal-react';

import {Box, Inline, Text, type TextElement, type TextLeading, type TextSize} from '@tryghost/shade/primitives';
import {Button, type ButtonProps} from '@tryghost/shade/components';
import {DirtyConfirmDialog, SettingsModal, type SettingsModalSize, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {cn, useGlobalDirtyState} from '@tryghost/shade/utils';

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

/**
 * Compatibility shell for settings preview modals while the legacy NiceModal
 * flows are migrated to consumer-controlled Shade compositions.
 */
export interface PreviewModalProps {
    testId?: string;
    title?: string;
    titleHeadingLevel?: HeadingLevel;
    size?: SettingsModalSize;
    width?: 'full' | number;
    height?: 'full' | number;
    sidebar?: boolean | React.ReactNode;
    preview?: React.ReactNode;
    dirty?: boolean;
    cancelLabel?: string;
    okLabel?: string;
    okVariant?: ButtonProps['variant'];
    buttonsDisabled?: boolean;
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
            previewBgClass = 'bg-preview-canvas';
        } else if (previewBgColor === 'greygradient') {
            previewBgClass = 'bg-gradient-to-tr from-preview-gradient-start to-preview-gradient-end';
        }

        const containerClasses = cn(
            'absolute inset-y-0 right-[400px] left-0 flex w-full min-w-100 grow flex-col overflow-y-auto',
            previewBgClass
        );

        let viewSiteButton;
        if (siteLink) {
            viewSiteButton = (
                <Box className='ml-3 border-l border-border-strong'>
                    <a className='ml-3 flex items-center gap-1' href={siteLink} rel='noopener noreferrer' target='_blank'>View site <ExternalLink className='size-3' /></a>
                </Box>
            );
        }

        preview = (
            <Box className={containerClasses}>
                {previewToolbar && <Inline as='header' className='relative h-[80px] shrink-0 px-8 py-5' data-testid='design-toolbar' justify='center'>
                    {leftToolbar && <Inline align='center' className='absolute left-8 h-full'>
                        {toolbarLeft}
                    </Inline>}
                    {rightToolbar && <Inline align='center' className='absolute right-8 h-full'>
                        {deviceSelector}
                        {viewSiteButton}
                    </Inline>}
                </Inline>}
                <Inline align='center' className='grow text-muted-foreground' justify='center'>
                    {preview}
                </Inline>
            </Box>
        );
    }

    const handleCancel = onCancel || (() => {
        confirm(dirty, () => {
            modal.remove();
            afterClose?.();
        });
    });

    return (
        <SettingsModal
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
            <Inline align='stretch' className='h-full grow' gap='none'>
                <Box className={cn(
                    'relative hidden grow flex-col [@media(min-width:801px)]:!visible [@media(min-width:801px)]:!flex',
                    previewBgColor === 'grey' ? 'bg-preview-canvas' : 'bg-surface-panel'
                )}>
                    {preview}
                </Box>
                {sidebar &&
                    <Box className='relative flex size-full flex-col border-l border-border-default bg-surface-elevated-2 [@media(min-width:801px)]:w-auto [@media(min-width:801px)]:basis-[400px]'>
                        {sidebarHeader ? sidebarHeader : (
                            <Inline align='center' className='max-h-[82px] px-7 py-6' gap='md' justify='between'>
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
                            </Inline>
                        )}
                        <Box className={cn(
                            'flex flex-col justify-between overflow-y-auto',
                            !sidebarHeader && 'absolute inset-x-0 top-[80px] bottom-0 grow',
                            sidebarPadding && 'p-7 pt-0',
                            sidebarContentClasses
                        )}>
                            {sidebar}
                        </Box>
                    </Box>
                }
            </Inline>
            <DirtyConfirmDialog {...dialogProps} />
        </SettingsModal>
    );
};
