import Button, {IButton} from './Button';
import ButtonGroup from './ButtonGroup';
import Heading from './Heading';
import React from 'react';
import StickyFooter from './StickyFooter';
import clsx from 'clsx';
import {useModal} from '@ebay/nice-modal-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'bleed' | number;

export interface ModalProps {

    /**
     * Possible values are: `sm`, `md`, `lg`, `xl, `full`, `bleed`. Yu can also use any number to set an arbitrary width.
     */
    size?: ModalSize;

    title?: string;
    okLabel?: string;
    okColor?: string;
    cancelLabel?: string;
    leftButtonLabel?: string;
    customFooter?: React.ReactNode;
    noPadding?: boolean;
    onOk?: () => void;
    onCancel?: () => void;
    children?: React.ReactNode;
    backDrop?: boolean;
    backDropClick?: boolean;
    stickyFooter?: boolean;
}

const Modal: React.FC<ModalProps> = ({
    size = 'md',
    title,
    okLabel = 'OK',
    cancelLabel = 'Cancel',
    customFooter,
    leftButtonLabel,
    noPadding = false,
    onOk,
    okColor = 'black',
    onCancel,
    children,
    backDrop = true,
    backDropClick = true,
    stickyFooter = false
}) => {
    const modal = useModal();

    let buttons: IButton[] = [];

    if (!customFooter) {
        if (cancelLabel) {
            buttons.push({
                key: 'cancel-modal',
                label: cancelLabel,
                onClick: (onCancel ? onCancel : () => {
                    modal.remove();
                })
            });
        }

        if (okLabel) {
            buttons.push({
                key: 'ok-modal',
                label: okLabel,
                color: okColor,
                className: 'min-w-[80px]',
                onClick: onOk
            });
        }
    }

    let modalClasses = clsx(
        'relative z-50 mx-auto flex max-h-[100%] w-full flex-col justify-between overflow-y-auto overflow-x-hidden rounded bg-white shadow-xl'
        // !stickyFooter && ' overflow-hidden'
    );
    let backdropClasses = clsx('fixed inset-0 z-40 h-[100vh] w-[100vw] overflow-y-scroll ');

    let padding = '';

    switch (size) {
    case 'sm':
        modalClasses += ' max-w-[480px] ';
        backdropClasses += ' p-[8vmin]';
        padding = 'p-8';
        break;

    case 'md':
        modalClasses += ' max-w-[720px] ';
        backdropClasses += ' p-[8vmin]';
        padding = 'p-8';
        break;

    case 'lg':
        modalClasses += ' max-w-[1020px] ';
        backdropClasses += ' p-[4vmin]';
        padding = 'p-8';
        break;

    case 'xl':
        modalClasses += ' max-w-[1240px] ';
        backdropClasses += ' p-[3vmin]';
        padding = 'p-10';
        break;

    case 'full':
        modalClasses += ' h-full ';
        backdropClasses += ' p-[2vmin]';
        padding = 'p-10';
        break;

    case 'bleed':
        modalClasses += ' h-full ';
        padding = 'p-10';
        break;

    default:
        backdropClasses += ' p-[8vmin]';
        padding = 'p-8';
        break;
    }

    if (noPadding) {
        padding = 'p-0';
    }

    let footerClasses = clsx(
        `${padding} ${stickyFooter ? 'py-6' : 'pt-0'}`,
        'flex w-full items-center justify-between'
    );

    let contentClasses = clsx(
        padding,
        size === 'full' && 'h-full'
    );

    if (!customFooter) {
        contentClasses += ' pb-0 ';
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        if (e.target === e.currentTarget && backDropClick) {
            modal.remove();
        }
    };

    const modalStyles = (typeof size === 'number') ? {
        width: size + 'px'
    } : {};

    const footerContent = (
        <div className={footerClasses}>
            <div>
                {leftButtonLabel &&
                <Button label={leftButtonLabel} link={true} />
                }
            </div>
            <div className='flex gap-3'>
                <ButtonGroup buttons={buttons}/>
            </div>
        </div>
    );

    const footer = (stickyFooter ?
        <StickyFooter height={84}>
            {footerContent}
        </StickyFooter>
        :
        <>
            {footerContent}
        </>
    );

    return (
        <div className={backdropClasses} id='modal-backdrop' onClick={handleBackdropClick}>
            <div className={clsx(
                'pointer-events-none fixed inset-0 z-0',
                backDrop && 'bg-[rgba(98,109,121,0.15)] backdrop-blur-[3px]'
            )}></div>
            <section className={modalClasses} style={modalStyles}>
                <div className={contentClasses}>
                    <div className='h-full'>
                        {title && <Heading level={4}>{title}</Heading>}
                        {children}
                    </div>
                </div>
                {customFooter ? customFooter :
                    footer
                }
            </section>
        </div>
    );
};

export default Modal;