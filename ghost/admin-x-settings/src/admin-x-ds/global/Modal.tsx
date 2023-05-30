import Button, {IButton} from './Button';
import ButtonGroup from './ButtonGroup';
import Heading from './Heading';
import React from 'react';
import {useModal} from '@ebay/nice-modal-react';

export type ModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'full' | 'bleed';

export interface ModalProps {
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
    children
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
            styles: 'min-w-[80px]',
            onClick: onOk
        });
    }

    let modalStyles = 'relative rounded overflow-hidden z-50 mx-auto flex flex-col justify-between bg-white shadow-xl w-full';
    let backdropStyles = 'fixed inset-0 h-[100vh] w-[100vw] overflow-y-scroll ';

    switch (size) {
    case 'sm':
        modalStyles += ` max-w-[480px] ${!noPadding && 'p-8'}`;
        backdropStyles += ' p-[8vmin]';
        break;

    case 'md':
        modalStyles += ` max-w-[720px] ${!noPadding && 'p-8'}`;
        backdropStyles += ' p-[8vmin]';
        break;

    case 'lg':
        modalStyles += ` max-w-[1020px] ${!noPadding && 'p-12'}`;
        backdropStyles += ' p-[4vmin]';
        break;

    case 'xl':
        modalStyles += ` max-w-[1240px] ${!noPadding && 'p-14'}`;
        backdropStyles += ' p-[3vmin]';
        break;

    case 'full':
        modalStyles += ` h-full ${!noPadding && 'p-12'}`;
        backdropStyles += ' p-[2vmin]';
        break;

    case 'bleed':
        modalStyles += ` h-full ${!noPadding && 'p-12'}`;
        break;
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {        
        if (e.target === e.currentTarget) {
            modal.remove();
        }
    };

    return (
        <div className={backdropStyles} id='modal-backdrop' onClick={handleBackdropClick}>
            <div className='pointer-events-none fixed inset-0 z-0 bg-[rgba(0,0,0,0.1)]'></div>
            <section className={modalStyles}>
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