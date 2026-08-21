import {useEffect, useState} from 'react';

import {Button} from '@tryghost/shade/components';
import {Box, Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon} from '@tryghost/shade/utils';

import {WebPreview, WebPreviewBody, WebPreviewNavigation, WebPreviewNavigationButton, WebPreviewUrl} from './ai-elements/web-preview';

import type {FormEvent, ReactNode, Ref} from 'react';

export type PreviewInteractionMode = 'browse' | 'select' | 'edit';

type ResponsiveViewport = 'desktop' | 'tablet' | 'mobile';

const viewportWidths: Record<ResponsiveViewport, string> = {
    desktop: '100%',
    tablet: '768px',
    mobile: '390px'
};

export const PreviewPanel = ({children, url = '', canGoBack = false, canGoForward = false, mode = 'browse', editButtonRef, disabled = false, showAddress = true, showEdit = true, showHistory = true, responsive = false, onBack, onForward, onNavigate, onSetMode}: {
    children: ReactNode;
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

    return (
        <WebPreview>
            <WebPreviewNavigation aria-label='Preview controls'>
                {showHistory && (
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
                    <form className='min-w-0 flex-1' onSubmit={submitAddress}>
                        <WebPreviewUrl aria-label='Preview address' disabled={disabled} value={address} onChange={event => setAddress(event.target.value)} />
                    </form>
                ) : <Box className='min-w-0 flex-1' />}
                {responsive && (
                    <Inline align='center' gap='xs'>
                        <WebPreviewNavigationButton aria-label='Desktop preview' aria-pressed={viewport === 'desktop'} disabled={disabled} onClick={() => setViewport('desktop')}>
                            <LucideIcon.Monitor aria-hidden='true' />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton aria-label='Tablet preview' aria-pressed={viewport === 'tablet'} disabled={disabled} onClick={() => setViewport('tablet')}>
                            <LucideIcon.Tablet aria-hidden='true' />
                        </WebPreviewNavigationButton>
                        <WebPreviewNavigationButton aria-label='Mobile preview' aria-pressed={viewport === 'mobile'} disabled={disabled} onClick={() => setViewport('mobile')}>
                            <LucideIcon.Smartphone aria-hidden='true' />
                        </WebPreviewNavigationButton>
                    </Inline>
                )}
                {onSetMode && (
                    <Inline align='center' gap='xs'>
                        <Button
                            aria-label='Select preview content'
                            aria-pressed={mode === 'select'}
                            disabled={disabled}
                            size='sm'
                            type='button'
                            variant={mode === 'select' ? 'default' : 'ghost'}
                            onClick={() => onSetMode(mode === 'select' ? 'browse' : 'select')}
                        >
                            <LucideIcon.MousePointer2 aria-hidden='true' />
                            Select
                        </Button>
                        {showEdit && <Button
                            ref={editButtonRef}
                            aria-label='Edit preview'
                            aria-pressed={mode === 'edit'}
                            disabled={disabled}
                            size='sm'
                            type='button'
                            variant={mode === 'edit' ? 'default' : 'ghost'}
                            onClick={() => onSetMode(mode === 'edit' ? 'browse' : 'edit')}
                        >
                            <LucideIcon.Pencil aria-hidden='true' />
                            Edit
                        </Button>}
                    </Inline>
                )}
            </WebPreviewNavigation>
            {navigationError && <Text className='border-b border-border-default px-3 py-2 text-destructive' role='alert' size='sm'>{navigationError}</Text>}
            <WebPreviewBody className={`${responsive ? 'flex justify-center overflow-auto bg-secondary' : ''} ${disabled ? 'pointer-events-none' : ''}`} inert={disabled}>
                <Box className='h-full max-w-full overflow-hidden bg-background transition-[width]' style={responsive ? {width: viewportWidths[viewport]} : undefined}>{children}</Box>
            </WebPreviewBody>
        </WebPreview>
    );
};
