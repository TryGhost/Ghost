import {useModal} from '@ebay/nice-modal-react';
import {cva} from 'class-variance-authority';
import {X} from 'lucide-react';
import React, {forwardRef, useEffect, useState} from 'react';

import {Button, type ButtonProps} from '@/components/ui/button';
import {LoadingIndicator} from '@/components/ui/loading-indicator';
import {StickyFooter} from '@/components/ui/sticky-footer';
import {Box} from '@/components/primitives/box';
import {Inline} from '@/components/primitives/inline';
import {Text} from '@/components/primitives/text';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@/components/patterns/dirty-confirm-dialog';
import useGlobalDirtyState from '@/hooks/use-global-dirty-state';
import {cn} from '@/lib/utils';

/**
 * Compatibility shell for settings modals while the legacy NiceModal flows are
 * migrated to Shade's consumer-controlled Dialog primitives.
 */
export type SettingsModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'bleed';

export interface SettingsModalProps {
    'aria-label'?: string;
    className?: string;
    size?: SettingsModalSize;
    width?: 'full' | 'toSidebar' | number;
    height?: 'full' | number;
    align?: 'center' | 'left' | 'right';
    testId?: string;
    title?: React.ReactNode;
    okLabel?: string;
    okVariant?: ButtonProps['variant'];
    okLoading?: boolean;
    cancelLabel?: string;
    leftButton?: React.ReactNode;
    buttonsDisabled?: boolean;
    okDisabled?: boolean;
    footer?: boolean | React.ReactNode;
    header?: boolean;
    padding?: boolean;
    onOk?: () => void;
    onCancel?: () => void;
    topRightContent?: 'close' | React.ReactNode;
    hideXOnMobile?: boolean;
    afterClose?: () => void;
    children?: React.ReactNode;
    backDrop?: boolean;
    backDropClick?: boolean;
    stickyFooter?: boolean;
    stickyHeader?: boolean;
    scrolling?: boolean;
    dirty?: boolean;
    animate?: boolean;
    formSheet?: boolean;
    enableCMDS?: boolean;
    allowBackgroundInteraction?: boolean;
}

export const topLevelBackdropClasses = 'bg-modal-backdrop backdrop-blur-[3px]';

const settingsModalVariants = cva(
    'relative z-50 flex max-h-full w-full flex-col justify-between overflow-x-hidden bg-background text-foreground',
    {
        variants: {
            size: {
                sm: 'max-w-[480px] rounded',
                md: 'max-w-[720px] rounded',
                lg: 'max-w-[1020px] rounded',
                xl: 'max-w-[1240px] rounded',
                full: 'h-full rounded',
                bleed: 'h-full'
            },
            align: {
                center: 'mx-auto',
                left: 'mr-auto',
                right: 'ml-auto'
            },
            scrolling: {
                true: 'overflow-y-auto',
                false: 'overflow-y-hidden'
            },
            formSheet: {
                true: 'shadow-md',
                false: 'shadow-xl'
            }
        },
        defaultVariants: {
            size: 'md',
            align: 'center',
            scrolling: true,
            formSheet: false
        }
    }
);

const backdropPadding: Record<SettingsModalSize, string> = {
    sm: 'p-4 md:p-[8vmin]',
    md: 'p-4 md:p-[8vmin]',
    lg: 'p-4 md:p-[4vmin]',
    xl: 'p-4 md:p-[3vmin]',
    full: 'p-4 md:p-[3vmin]',
    bleed: ''
};

const contentPadding: Record<SettingsModalSize, string> = {
    sm: 'p-8',
    md: 'p-8',
    lg: 'p-7',
    xl: 'p-10',
    full: 'p-10',
    bleed: 'p-10'
};

const headerOffsets: Record<SettingsModalSize, string> = {
    sm: '-inset-x-8',
    md: '-inset-x-8',
    lg: '-inset-x-8',
    xl: '-inset-x-10 -top-10',
    full: '-inset-x-10',
    bleed: '-inset-x-10'
};

const SettingsModal = forwardRef<HTMLElement, SettingsModalProps>(({
    'aria-label': ariaLabel,
    className,
    size = 'md',
    align = 'center',
    width,
    height,
    testId,
    title,
    okLabel = 'OK',
    okLoading = false,
    cancelLabel = 'Cancel',
    footer,
    header,
    leftButton,
    buttonsDisabled,
    okDisabled,
    padding = true,
    onOk,
    okVariant = 'default',
    onCancel,
    topRightContent,
    hideXOnMobile = false,
    afterClose,
    children,
    backDrop = true,
    backDropClick = true,
    stickyFooter = false,
    stickyHeader = false,
    scrolling = true,
    dirty = false,
    animate = true,
    formSheet = false,
    enableCMDS = true,
    allowBackgroundInteraction = false
}, ref) => {
    const modal = useModal();
    const {setGlobalDirtyState} = useGlobalDirtyState();
    const {confirm, dialogProps} = useDirtyConfirmation();
    const [animationFinished, setAnimationFinished] = useState(false);
    useEffect(() => {
        setGlobalDirtyState(dirty);
    }, [dirty, setGlobalDirtyState]);

    const removeModal = () => {
        confirm(dirty, () => {
            modal.remove();
            afterClose?.();
        });
    };

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key !== 'Escape') {
                return;
            }

            const activeElement = document.activeElement;
            if (activeElement?.hasAttribute('data-kg-link-input')) {
                return;
            }

            if (activeElement instanceof HTMLElement) {
                activeElement.blur();
            }

            setTimeout(() => {
                if (onCancel) {
                    onCancel();
                } else {
                    removeModal();
                }
            });

            event.stopPropagation();
        };

        document.addEventListener('keydown', handleEscapeKey);
        return () => document.removeEventListener('keydown', handleEscapeKey);
    });

    useEffect(() => {
        const timeout = setTimeout(() => setAnimationFinished(true), 250);
        return () => clearTimeout(timeout);
    }, []);

    useEffect(() => {
        if (!onOk || !enableCMDS) {
            return;
        }

        const handleCMDS = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key === 's') {
                event.preventDefault();
                onOk();
            }
        };

        window.addEventListener('keydown', handleCMDS);
        return () => window.removeEventListener('keydown', handleCMDS);
    }, [enableCMDS, onOk]);

    const paddingClasses = padding ? contentPadding[size] : 'p-0';
    const modalClasses = cn(
        settingsModalVariants({size, align, scrolling, formSheet}),
        className,
        animate && !formSheet && !animationFinished && align === 'center' && 'animate-modal-in',
        animate && !formSheet && !animationFinished && align === 'right' && 'animate-modal-in-from-right',
        formSheet && !animationFinished && 'animate-modal-in-reverse',
        width === 'full' && 'w-full',
        width === 'toSidebar' && 'w-full max-w-[calc(100dvw_-_280px)] lg:max-w-full min-[1280px]:max-w-[calc(100dvw_-_320px)]',
        height === 'full' && 'h-full',
        allowBackgroundInteraction && 'pointer-events-auto'
    );
    const backdropClasses = cn(
        'fixed inset-0 z-[1000] h-[100dvh] w-[100dvw] max-[800px]:pb-20',
        backdropPadding[size],
        allowBackgroundInteraction && 'pointer-events-none'
    );
    const headerClasses = cn(
        paddingClasses,
        'pb-0',
        headerOffsets[size],
        topRightContent && topRightContent !== 'close' && 'flex items-center justify-between gap-5',
        stickyHeader && 'sticky -top-px z-[300] -mb-4 bg-background pb-4'
    );
    const contentClasses = cn(
        paddingClasses,
        'py-0',
        (size === 'full' || size === 'bleed' || height === 'full' || typeof height === 'number') && 'grow',
        footer === false && 'pb-0'
    );
    const footerClasses = cn(
        paddingClasses,
        'flex w-full items-center justify-between',
        stickyFooter && 'py-6'
    );
    const modalStyles: React.CSSProperties = {
        ...(typeof width === 'number' ? {width: '100%', maxWidth: `${width}px`} : {}),
        ...(typeof height === 'number' ? {height: '100%', maxHeight: `${height}px`} : {})
    };

    const handleBackdropClick = (event: React.MouseEvent<HTMLDivElement>) => {
        if (event.target === event.currentTarget && backDropClick) {
            removeModal();
        }
    };

    let footerContent: React.ReactNode;
    if (footer) {
        footerContent = footer;
    } else if (footer !== false) {
        footerContent = (
            <Inline className={footerClasses} gap='none' justify='between'>
                <Box>{leftButton}</Box>
                <Inline gap='md'>
                    {cancelLabel && (
                        <Button className='font-semibold' data-testid='cancel-modal' disabled={buttonsDisabled} type='button' variant='ghost' onClick={onCancel || removeModal}>
                            {cancelLabel}
                        </Button>
                    )}
                    {okLabel && (
                        <Button className='min-w-20' data-testid='ok-modal' disabled={buttonsDisabled || okDisabled || okLoading} type='button' variant={okVariant} onClick={onOk}>
                            {okLoading && <LoadingIndicator size='sm' />}
                            {okLabel}
                        </Button>
                    )}
                </Inline>
            </Inline>
        );
    }

    if (stickyFooter) {
        footerContent = <StickyFooter height={84}>{footerContent}</StickyFooter>;
    }

    const titleContent = title && (
        <Text as='h3' className='md:text-2xl' leading='heading' size='xl' weight='bold'>
            {title}
        </Text>
    );
    const headerContent = topRightContent && topRightContent !== 'close' ? (
        <Inline as='header' className={headerClasses} gap='lg' justify='between'>
            {titleContent}
            {topRightContent}
        </Inline>
    ) : (
        <header className={headerClasses}>
            {titleContent}
            <Box className={cn(
                'absolute top-6 right-6',
                topRightContent !== 'close' && 'md:hidden',
                hideXOnMobile && 'hidden'
            )}>
                <Button aria-label='Close modal' className='-m-2 opacity-50 hover:opacity-100' data-testid='close-modal' size='icon' type='button' variant='ghost' onClick={removeModal}>
                    <X />
                </Button>
            </Box>
        </header>
    );

    return (
        <>
            <Box className={backdropClasses} id='modal-backdrop' onMouseDown={handleBackdropClick}>
                <Box className={cn(
                    'pointer-events-none fixed inset-0 z-0',
                    backDrop && !formSheet && topLevelBackdropClasses,
                    formSheet && 'bg-form-sheet-backdrop'
                )} />
                <section
                    ref={ref}
                    aria-label={ariaLabel}
                    className={modalClasses}
                    data-testid={testId}
                    style={modalStyles}
                >
                    {header !== false && headerContent}
                    <Box className={contentClasses}>{children}</Box>
                    {footerContent}
                </section>
            </Box>
            <DirtyConfirmDialog {...dialogProps} />
        </>
    );
});

SettingsModal.displayName = 'SettingsModal';

export {SettingsModal, settingsModalVariants};
