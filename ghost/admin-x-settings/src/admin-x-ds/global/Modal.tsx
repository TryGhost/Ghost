import Button, {IButton} from './Button';
import ButtonGroup from './ButtonGroup';
import Heading from './Heading';
import React from 'react';
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
    backDrop = true
}) => {
    const modal = useModal();

    let buttons: IButton[] = [];

    if (!customFooter) {
        buttons.push({
            key: 'cancel-modal',
            label: cancelLabel, 
            onClick: (onCancel ? onCancel : () => {
                modal.remove();
            })
        });

        buttons.push({
            key: 'ok-modal',
            label: okLabel, 
            color: okColor,
            className: 'min-w-[80px]',
            onClick: onOk
        });
    }

    let modalClasses = 'relative rounded overflow-hidden z-50 mx-auto flex flex-col justify-between bg-white shadow-xl w-full';
    let backdropClasses = 'fixed inset-0 h-[100vh] w-[100vw] overflow-y-scroll z-40 ';

    switch (size) {
    case 'sm':
        modalClasses += ` max-w-[480px] ${!noPadding && 'p-8'}`;
        backdropClasses += ' p-[8vmin]';
        break;

    case 'md':
        modalClasses += ` max-w-[720px] ${!noPadding && 'p-8'}`;
        backdropClasses += ' p-[8vmin]';
        break;

    case 'lg':
        modalClasses += ` max-w-[1020px] ${!noPadding && 'p-12'}`;
        backdropClasses += ' p-[4vmin]';
        break;

    case 'xl':
        modalClasses += ` max-w-[1240px] ${!noPadding && 'p-14'}`;
        backdropClasses += ' p-[3vmin]';
        break;

    case 'full':
        modalClasses += ` h-full ${!noPadding && 'p-12'}`;
        backdropClasses += ' p-[2vmin]';
        break;

    case 'bleed':
        modalClasses += ` h-full ${!noPadding && 'p-12'}`;
        break;

    default: 
        modalClasses += ` ${!noPadding && 'p-8'}`;
        backdropClasses += ' p-[8vmin]';
        break;
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {        
        if (e.target === e.currentTarget && backDrop) {
            modal.remove();
        }
    };

    const modalStyles = (typeof size === 'number') ? {
        width: size + 'px'
    } : {};

    return (
        <div className={backdropClasses} id='modal-backdrop' onClick={handleBackdropClick}>
            <div className={`pointer-events-none fixed inset-0 z-0 bg-[rgba(98,109,121,0.15)] backdrop-blur-[3px]`}></div>
            <section className={modalClasses} style={modalStyles}>
                <div className='h-full'>
                    {title && <Heading level={4}>{title}</Heading>}
                    {children}
                </div>
                {customFooter ? customFooter : 
                    <div className='w-100 flex items-center justify-between gap-6'>
                        <div>
                            {leftButtonLabel &&
                                <Button label={leftButtonLabel} link={true} />
                            }
                        </div>
                        <div className='flex gap-3'>
                            <ButtonGroup buttons={buttons}/>
                        </div>
                    </div>
                }
            </section>
        </div>
    );
};

export default Modal;