import {useModal} from '@ebay/nice-modal-react';
import clsx from 'clsx';
import React, {useEffect, useState, forwardRef} from 'react';
import {Button, type ButtonProps, LoadingIndicator, StickyFooter} from '@tryghost/shade/components';
import {DirtyConfirmDialog, useDirtyConfirmation} from '@tryghost/shade/patterns';
import {Inline, Text} from '@tryghost/shade/primitives';
import {LucideIcon, useGlobalDirtyState} from '@tryghost/shade/utils';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'bleed';

export interface ModalProps {

    /**
     * Possible values are: `sm`, `md`, `lg`, `xl, `full`, `bleed`. Yu can also use any number to set an arbitrary width.
     */
    size?: ModalSize;
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
    stickyHeader?:boolean;
    scrolling?: boolean;
    dirty?: boolean;
    animate?: boolean;
    formSheet?: boolean;
    enableCMDS?: boolean;
    allowBackgroundInteraction?: boolean;
}

export const topLevelBackdropClasses = 'bg-[rgba(98,109,121,0.2)] backdrop-blur-[3px]';

const Modal = forwardRef<HTMLElement, ModalProps>(({
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

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                // Don't close modal if user is in Koenig's link input (which handles ESC itself)
                const activeEl = document.activeElement;
                if (activeEl?.hasAttribute('data-kg-link-input')) {
                    return;
                }

                // Fix for Safari - if an element in the modal is focused, closing it will jump to
                // the bottom of the page because Safari tries to focus the "next" element in the DOM
                if (document.activeElement && document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                }
                // Close the modal on the next tick so that the blur registers
                setTimeout(() => {
                    if (onCancel) {
                        onCancel();
                    } else {
                        confirm(dirty, () => {
                            modal.remove();
                            afterClose?.();
                        });
                    }
                });

                // Prevent the event from bubbling up to the window level
                event.stopPropagation();
            }
        };

        document.addEventListener('keydown', handleEscapeKey);

        // Clean up the event listener when the modal is closed
        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [modal, dirty, afterClose, onCancel, confirm]);

    // The animation classes apply a transform to the modal, which breaks anything inside using position:fixed
    // We should remove the class as soon as the animation is finished
    useEffect(() => {
        const timeout = setTimeout(() => {
            setAnimationFinished(true);
        }, 250);

        return () => clearTimeout(timeout);
    }, []);

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

    let contentClasses;

    const removeModal = () => {
        confirm(dirty, () => {
            modal.remove();
            afterClose?.();
        });
    };

    let modalClasses = clsx(
        'relative z-50 flex max-h-[100%] w-full flex-col justify-between overflow-x-hidden bg-white dark:bg-black',
        align === 'center' && 'mx-auto',
        align === 'left' && 'mr-auto',
        align === 'right' && 'ml-auto',
        size !== 'bleed' && 'rounded',
        formSheet ? 'shadow-md' : 'shadow-xl',
        (animate && !formSheet && !animationFinished && align === 'center') && 'animate-modal-in',
        (animate && !formSheet && !animationFinished && align === 'right') && 'animate-modal-in-from-right',
        (formSheet && !animationFinished) && 'animate-modal-in-reverse',
        scrolling ? 'overflow-y-auto' : 'overflow-y-hidden'
    );

    let backdropClasses = clsx(
        'fixed inset-0 z-[1000] h-[100dvh] w-[100dvw]',
        allowBackgroundInteraction && 'pointer-events-none'
    );

    let paddingClasses = '';
    let headerClasses = clsx(
        (!topRightContent || topRightContent === 'close') ? '' : 'flex items-center justify-between gap-5'
    );

    if (stickyHeader) {
        headerClasses = clsx(
            headerClasses,
            'sticky top-0 z-[300] -mb-4 bg-white pb-4! dark:bg-black'
        );
    }

    switch (size) {
    case 'sm':
        modalClasses = clsx(
            modalClasses,
            'max-w-[480px]'
        );
        backdropClasses = clsx(
            backdropClasses,
            'p-4 md:p-[8vmin]'
        );
        paddingClasses = 'p-8';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-8'
        );
        break;

    case 'md':
        modalClasses = clsx(
            modalClasses,
            'max-w-[720px]'
        );
        backdropClasses = clsx(
            backdropClasses,
            'p-4 md:p-[8vmin]'
        );
        paddingClasses = 'p-8';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-8'
        );
        break;

    case 'lg':
        modalClasses = clsx(
            modalClasses,
            'max-w-[1020px]'
        );
        backdropClasses = clsx(
            backdropClasses,
            'p-4 md:p-[4vmin]'
        );
        paddingClasses = 'p-7';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-8'
        );
        break;

    case 'xl':
        modalClasses = clsx(
            modalClasses,
            'max-w-[1240px]0'
        );
        backdropClasses = clsx(
            backdropClasses,
            'p-4 md:p-[3vmin]'
        );
        paddingClasses = 'p-10';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-10 -top-10'
        );
        break;

    case 'full':
        modalClasses = clsx(
            modalClasses,
            'h-full'
        );
        backdropClasses = clsx(
            backdropClasses,
            'p-4 md:p-[3vmin]'
        );
        paddingClasses = 'p-10';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-10'
        );
        break;

    case 'bleed':
        modalClasses = clsx(
            modalClasses,
            'h-full'
        );
        paddingClasses = 'p-10';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-10'
        );
        break;

    default:
        backdropClasses = clsx(
            backdropClasses,
            'p-4 md:p-[8vmin]'
        );
        paddingClasses = 'p-8';
        headerClasses = clsx(
            headerClasses,
            '-inset-x-8'
        );
        break;
    }

    if (!padding) {
        paddingClasses = 'p-0';
    }

    modalClasses = clsx(
        modalClasses
    );

    headerClasses = clsx(
        headerClasses,
        paddingClasses,
        'pb-0'
    );

    contentClasses = clsx(
        paddingClasses,
        'py-0'
    );

    // Set bottom padding for backdrop when the menu is on
    backdropClasses = clsx(
        backdropClasses,
        'max-[800px]:!pb-20'
    );

    const footerClasses = clsx(
        `${paddingClasses} ${stickyFooter ? 'py-6' : ''}`,
        'flex w-full items-center justify-between'
    );

    contentClasses = clsx(
        contentClasses,
        ((size === 'full' || size === 'bleed' || height === 'full' || typeof height === 'number') && 'grow')
    );

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && backDropClick) {
            removeModal();
        }
    };

    const modalStyles:{width?: string; height?: string; maxWidth?: string; maxHeight?: string;} = {};

    if (typeof width === 'number') {
        modalStyles.width = '100%';
        modalStyles.maxWidth = width + 'px';
    } else if (width === 'full') {
        modalClasses = clsx(
            modalClasses,
            'w-full'
        );
    } else if (width === 'toSidebar') {
        modalClasses = clsx(
            modalClasses,
            'w-full max-w-[calc(100dvw_-_280px)] lg:max-w-full min-[1280px]:max-w-[calc(100dvw_-_320px)]'
        );
    }

    if (typeof height === 'number') {
        modalStyles.height = '100%';
        modalStyles.maxHeight = height + 'px';
    } else if (height === 'full') {
        modalClasses = clsx(
            modalClasses,
            'h-full'
        );
    }

    let footerContent;
    if (footer) {
        footerContent = footer;
    } else if (footer === false) {
        contentClasses += ' pb-0 ';
    } else {
        footerContent = (
            <div className={footerClasses}>
                <div>
                    {leftButton}
                </div>
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
            </div>
        );
    }

    footerContent = (stickyFooter ?
        <StickyFooter height={84}>
            {footerContent}
        </StickyFooter>
        :
        <>
            {footerContent}
        </>
    );

    return (
        <>
            <div className={backdropClasses} id='modal-backdrop' onMouseDown={handleBackdropClick}>
                <div className={clsx(
                    'pointer-events-none fixed inset-0 z-0',
                    (backDrop && !formSheet) && topLevelBackdropClasses,
                    formSheet && 'bg-[rgba(98,109,121,0.08)]'
                )}></div>
                <section ref={ref} className={clsx(
                    modalClasses,
                    allowBackgroundInteraction && 'pointer-events-auto'
                )} data-testid={testId} style={modalStyles}>
                    {header === false ? '' : (!topRightContent || topRightContent === 'close' ?
                        (<header className={headerClasses}>
                            {title && <Text as='h3' className='md:text-2xl' leading='heading' size='xl' weight='bold'>{title}</Text>}
                            <div className={`${topRightContent !== 'close' && 'md:!invisible md:!hidden'} ${hideXOnMobile && 'hidden'} absolute top-6 right-6`}>
                                <Button aria-label='Close modal' className='-m-2 opacity-50 hover:opacity-100' data-testid='close-modal' size='icon' type='button' variant='ghost' onClick={removeModal}>
                                    <LucideIcon.X />
                                </Button>
                            </div>
                        </header>)
                        :
                        (<header className={headerClasses}>
                            {title && <Text as='h3' className='md:text-2xl' leading='heading' size='xl' weight='bold'>{title}</Text>}
                            {topRightContent}
                        </header>))}
                    <div className={contentClasses}>
                        {children}
                    </div>
                    {footerContent}
                </section>
            </div>
            <DirtyConfirmDialog {...dialogProps} />
        </>
    );
});

Modal.displayName = 'Modal';

export default Modal;
