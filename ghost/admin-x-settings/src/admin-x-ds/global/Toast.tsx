import Icon from './Icon';
import React from 'react';
import {ToastOptions, toast} from 'react-hot-toast';

export type ToastType = 'neutral' | 'success' | 'error';

export interface ShowToastProps {
    message?: React.ReactNode;
    type?: ToastType;
    icon?: React.ReactNode | string;
    options?: ToastOptions
}

interface ToastProps {
    t: any;

    /**
     * Can be a name of an icon from the icon library or a react component
     */
    children?: React.ReactNode;
    props?: ShowToastProps;
}

const Toast: React.FC<ToastProps> = ({
    t,
    children,
    props
}) => {
    let classNames = `flex w-[300px] items-start justify-between rounded py-3 px-4 text-sm font-medium text-white gap-6 z-[90] `;

    if (t.visible) {
        classNames += ' animate-toaster-in';
    } else {
        classNames += ' animate-toaster-out';
    }

    switch (props?.type) {
    case 'success':
        classNames += ' bg-black';
        props.icon = props.icon || 'check-circle';
        break;
    case 'error':
        classNames += ' bg-red';
        props.icon = props.icon || 'warning';
        break;
    default:
        classNames += ' bg-black';
        break;
    }

    return (
        <div className={classNames}>
            <div className='flex items-start gap-3'>
                {props?.icon && (typeof props.icon === 'string' ?
                    <div className='mt-0.5'><Icon className='grow' colorClass={props.type === 'success' ? 'text-green' : 'text-white'} name={props.icon} size='sm' /></div> : props.icon)}
                {children}
            </div>
            <button className='cursor-pointer' type='button' onClick={() => {
                toast.dismiss(t.id);
            }}>
                <div className='mt-1'>
                    <Icon colorClass='text-white' name='close' size='xs' />
                </div>
            </button>
        </div>
    );
};

export default Toast;

export const showToast = ({
    message,
    type = 'neutral',
    icon = '',
    options = {
        position: 'bottom-left',
        duration: 5000
    }
}: ShowToastProps): void => {
    if (!options.position) {
        options.position = 'bottom-left';
    }

    toast.custom(t => (
        <Toast props={{
            type: type,
            icon: icon
        }} t={t}>
            {message}
        </Toast>
    ),
    {
        ...options
    }
    );
};