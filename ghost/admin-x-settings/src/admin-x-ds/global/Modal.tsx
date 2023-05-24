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
    cancelLabel?: string;
    leftButtonLabel?: string;
    customFooter?: React.ReactNode;
    onOk?: () => void;
    onCancel?: () => void;
    children?: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({size = 'md', title, okLabel, cancelLabel, customFooter, leftButtonLabel, onOk, onCancel, children}) => {
    const modal = useModal();

    let buttons: IButton[] = [];

    if (!customFooter) {
        buttons.push({
            key: 'cancel-modal',
            label: cancelLabel ? cancelLabel : 'Cancel', 
            onClick: (onCancel ? onCancel : () => {
                modal.remove();
            })
        });

        buttons.push({
            key: 'ok-modal',
            label: okLabel ? okLabel : 'OK', 
            color: 'black',
            styles: 'min-w-[80px]',
            onClick: onOk
        });
    }

    let modalStyles = 'relative z-50 mx-auto flex flex-col justify-between bg-white p-8 shadow-xl w-full';
    let backdropStyles = 'fixed inset-0 h-[100vh] w-[100vw] overflow-y-scroll ';

    switch (size) {
    case 'sm':
        modalStyles += ' max-w-[480px]';
        break;

    case 'md':
        modalStyles += ' max-w-[720px]';
        break;

    case 'lg':
        modalStyles += ' max-w-[940px]';
        break;

    case 'xl':
        modalStyles += ' max-w-[1180px] ';
        break;

    case 'full':
    case 'bleed':
        modalStyles += ' h-full';
        break;
    }

    if (size !== 'bleed') {
        modalStyles += ' rounded';
    }

    if (size !== 'bleed' && size !== 'full') {
        backdropStyles += ' p-[8vmin]';
    } else if (size === 'full') {
        backdropStyles += ' p-[2vmin]';
    }

    const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
        modal.remove();
    };

    return (
        <div className={backdropStyles} id='modal-backdrop'>
            <div className='absolute inset-0 z-0 bg-[rgba(0,0,0,0.1)]' onClick={handleBackdropClick}></div>
            <section className={modalStyles}>
                <div>
                    {title && <Heading level={4}>{title}</Heading>}
                    <div>{children}</div>
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