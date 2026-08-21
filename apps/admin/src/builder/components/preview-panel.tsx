import {useEffect, useState} from 'react';
import {createPortal} from 'react-dom';

import {Box, Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import {WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl} from './ai-elements/web-preview';
import {useBuilderToolbarHost} from './builder-toolbar-context';

import type {FormEvent, ReactNode, Ref} from 'react';

export type PreviewInteractionMode = 'browse' | 'select' | 'edit';

type ResponsiveViewport = 'desktop' | 'tablet' | 'mobile';

const viewportWidths: Record<ResponsiveViewport, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px'
};

export const PreviewPanel = ({children, action, url = '', canGoBack = false, canGoForward = false, mode = 'browse', editButtonRef, disabled = false, showAddress = true, showEdit = true, showHistory = true, responsive = false, onBack, onForward, onNavigate, onSetMode}: {
    children: ReactNode;
    action?: ReactNode;
    url?: string;
    canGoBack?: boolean;
    canGoForward?: boolean;
    mode?: PreviewInteractionMode;
    editButtonRef?: Ref<HTMLButtonElement>;
    disabled?: boolean;
    showAddress?: boolean;
    showEdit?: boolean;
    showHistory?: boolean;
    responsive?: boolean;
    onBack?: () => void;
    onForward?: () => void;
    onNavigate?: (url: string) => void | Promise<boolean | string>;
    onSetMode?: (mode: PreviewInteractionMode) => void;
}) => {
    const [address, setAddress] = useState(url);
    const [navigationError, setNavigationError] = useState('');
    const [viewport, setViewport] = useState<ResponsiveViewport>('desktop');
    const {element: toolbarHost, isNarrow} = useBuilderToolbarHost();

    useEffect(() => {
        setAddress(url);
        setNavigationError('');
    }, [url]);

    const submitAddress = (event: FormEvent) => {
        event.preventDefault();
        const target = address.trim();
        if (target && target !== url) {
            setNavigationError('');
            void Promise.resolve(onNavigate?.(target)).then((outcome) => {
                if (outcome !== true) {
                    setAddress(url);
                    setNavigationError(typeof outcome === 'string' ? outcome : 'Builder could not open that preview address.');
                }
            });
        }
    };

    const previewControls = (
        <>
                {showHistory && !isNarrow && (
                    <>
                        <WebPreviewNavigationButton aria-label='Back in preview' disabled={disabled || !canGoBack} onClick={onBack}>
                            <LucideIcon.ArrowLeft aria-hidden='true' />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton aria-label='Forward in preview' disabled={disabled || !canGoForward} onClick={onForward}>
                            <LucideIcon.ArrowRight aria-hidden='true' />
                        </WebPreviewNavigationButton>
                    </>
                )}
                {showAddress ? (
                    <form className='mx-auto max-w-3xl min-w-0 flex-1' onSubmit={submitAddress}>
                        <WebPreviewUrl aria-label='Preview address' disabled={disabled} value={address} onChange={event => setAddress(event.target.value)} />
                    </form>
                ) : <Box className='min-w-0 flex-1' />}
                {responsive && !isNarrow && (
                    <Inline align='center' gap='xs'>
                        <WebPreviewNavigationButton aria-label='Desktop preview' aria-pressed={viewport === 'desktop'} className={viewport === 'desktop' ? 'builder-raised-surface bg-surface-elevated hover:bg-surface-elevated' : undefined} disabled={disabled} onClick={() => setViewport('desktop')}>
                            <LucideIcon.Monitor aria-hidden='true' />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton aria-label='Tablet preview' aria-pressed={viewport === 'tablet'} className={viewport === 'tablet' ? 'builder-raised-surface bg-surface-elevated hover:bg-surface-elevated' : undefined} disabled={disabled} onClick={() => setViewport('tablet')}>
                            <LucideIcon.Tablet aria-hidden='true' />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton aria-label='Mobile preview' aria-pressed={viewport === 'mobile'} className={viewport === 'mobile' ? 'builder-raised-surface bg-surface-elevated hover:bg-surface-elevated' : undefined} disabled={disabled} onClick={() => setViewport('mobile')}>
                            <LucideIcon.Smartphone aria-hidden='true' />
                        </WebPreviewNavigationButton>
                    </Inline>
                )}
                {onSetMode && (
                    <Inline align='center' gap='xs'>
                        <WebPreviewNavigationButton
                            aria-label='Select preview content'
                            aria-pressed={mode === 'select'}
                            className={`w-auto gap-2 px-3 ${mode === 'select' ? 'builder-raised-surface bg-surface-elevated hover:bg-surface-elevated' : ''}`}
                            disabled={disabled}
                            onClick={() => onSetMode(mode === 'select' ? 'browse' : 'select')}
                        >
                            <LucideIcon.MousePointer2 aria-hidden='true' />
                            <span className='hidden min-[768px]:inline'>Select</span>
                        </WebPreviewNavigationButton>
                        {showEdit && <WebPreviewNavigationButton
                            ref={editButtonRef}
                            aria-label='Edit preview'
                            aria-pressed={mode === 'edit'}
                            className={`w-auto gap-2 px-3 ${mode === 'edit' ? 'builder-raised-surface bg-surface-elevated hover:bg-surface-elevated' : ''}`}
                            disabled={disabled}
                            onClick={() => onSetMode(mode === 'edit' ? 'browse' : 'edit')}
                        >
                            <LucideIcon.Pencil aria-hidden='true' />
                            <span className='hidden min-[768px]:inline'>Edit</span>
                        </WebPreviewNavigationButton>}
                    </Inline>
                )}
        </>
    );
    const hostNavigation = (
            <WebPreviewNavigation aria-label='Builder actions' className='h-16 w-full'>
                {isNarrow ? <Box className='min-w-0 flex-1' /> : <Inline align='center' className='min-w-0 flex-1' data-preview-controls='' gap='xs'>{previewControls}</Inline>}
                {action && <Box className='builder-raised-action ml-2 shrink-0 [&>button]:min-w-24 [&>button]:rounded-full [&>button]:px-6'>{action}</Box>}
            </WebPreviewNavigation>
    );

    return (
        <WebPreview>
            {toolbarHost ? createPortal(hostNavigation, toolbarHost) : hostNavigation}
            {isNarrow && <WebPreviewNavigation aria-label='Preview controls' className='h-16 w-full' data-preview-controls=''>{previewControls}</WebPreviewNavigation>}
            {navigationError && <Text className='border-b border-border-default px-3 py-2 text-destructive' role='alert' size='sm'>{navigationError}</Text>}
            <WebPreviewBody className={`flex justify-center overflow-auto p-4 pt-0 min-[768px]:overflow-visible min-[768px]:pl-0 ${disabled ? 'pointer-events-none' : ''}`} inert={disabled}>
                <Box className='builder-raised-surface-strong h-full max-w-full overflow-hidden rounded-xl bg-background transition-[width]' style={responsive ? {width: viewportWidths[viewport]} : {width: '100%'}}>{children}</Box>
            </WebPreviewBody>
        </WebPreview>
    );
};
