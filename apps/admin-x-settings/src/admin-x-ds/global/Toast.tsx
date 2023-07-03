import Icon from './Icon';
import React from 'react';
import clsx from 'clsx';
import {ToastOptions, toast} from 'react-hot-toast';

export type ToastType = 'neutral' | 'success' | 'error' | 'pageError';

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
    switch (props?.type) {
    case 'success':
        props.icon = props.icon || 'check-circle';
        break;
    case 'error':
        props.icon = props.icon || 'warning';
        break;
    }

    const classNames = clsx(
        'z-[90] flex items-start justify-between gap-6 rounded px-4 py-3 text-sm font-medium text-white',
        (props?.type === 'success' || props?.type === 'neutral') && 'w-[300px] bg-black',
        props?.type === 'error' && 'w-[300px] bg-red',
        props?.options?.position === 'top-center' && 'w-full max-w-[520px] bg-red',
        t.visible ? (props?.options?.position === 'top-center' ? 'animate-toaster-top-in' : 'animate-toaster-in') : 'animate-toaster-out'
    );

    return (
        <div className={classNames} data-testid='toast'>
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

    if (type === 'pageError') {
        type = 'error';
        options.position = 'top-center';
        options.duration = Infinity;
    }

    toast.custom(t => (
        <Toast props={{
            type: type,
            icon: icon,
            options: options
        }} t={t}>
            {message}
        </Toast>
    ),
    {
        ...options
    }
    );
};
