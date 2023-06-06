import Button, {IButton} from './Button';
import ButtonGroup from './ButtonGroup';
import Heading from './Heading';
import React from 'react';
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

    //bg-[linear-gradient(0deg,rgba(255,255,255,1)_85%,rgba(255,255,255,0)_100%)]
    let modalClasses = clsx('relative z-50 mx-auto flex w-full flex-col justify-between rounded bg-white shadow-xl');
    let backdropClasses = clsx('fixed inset-0 z-40 h-[100vh] w-[100vw] overflow-y-scroll ');

    let padding;

    let footerContainerBottom = '';

    switch (size) {
    case 'sm':
        modalClasses += ' max-w-[480px] ';
        backdropClasses += ' p-[8vmin]';
        padding = 8;
        footerContainerBottom = 'calc(-1 * (8vmin + 48px)';
        break;

    case 'md':
        modalClasses += ' max-w-[720px] ';
        backdropClasses += ' p-[8vmin]';
        padding = 8;
        footerContainerBottom = 'calc(-1 * (8vmin + 48px)';
        break;

    case 'lg':
        modalClasses += ' max-w-[1020px] ';
        backdropClasses += ' p-[4vmin]';
        padding = 12;
        footerContainerBottom = 'calc(-1 * (4vmin + 68px)';
        break;

    case 'xl':
        modalClasses += ' max-w-[1240px] ';
        backdropClasses += ' p-[3vmin]';
        padding = 14;
        footerContainerBottom = 'calc(-1 * (3vmin + 68px)';
        break;

    case 'full':
        modalClasses += ' h-full ';
        backdropClasses += ' p-[2vmin]';
        padding = 12;
        footerContainerBottom = 'calc(-1 * (2vmin + 68px)';
        break;

    case 'bleed':
        modalClasses += ' h-full ';
        padding = 12;
        break;

    default:
        backdropClasses += ' p-[8vmin]';
        footerContainerBottom = 'calc(-1 * (8vmin + 48px)';
        padding = 8;
        break;
    }

    if (noPadding) {
        padding = 0;
    }

    let footerContainerClasses = clsx(
        'w-100',
        stickyFooter && 'sticky z-[100] mb-[-24px]',
        `${stickyFooter ? 'before:sticky' : 'before:hidden'} before:bottom-0 before:z-[100] before:block before:h-[24px] before:bg-white before:content-['']`,
        `${stickyFooter ? 'after:sticky' : 'after:hidden'} after:bottom-[72px] after:block after:h-[24px] after:shadow-[0_0_0_1px_rgba(0,0,0,.04),0_-8px_16px_-3px_rgba(0,0,0,.15)] after:content-['']`
    );

    let footerClasses = clsx(
        `px-${padding} pb-${padding} ${stickyFooter && `pt-8`} z-[101] flex items-center justify-between`,
        stickyFooter && `sticky bottom-[-48px] rounded-b bg-white`
    );

    let contentClasses = `p-${padding}`;

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
                    <div className={footerContainerClasses} style={{
                        bottom: `${stickyFooter && footerContainerBottom}`
                    }}>
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
                    </div>
                }
            </section>
        </div>
    );
};

export default Modal;