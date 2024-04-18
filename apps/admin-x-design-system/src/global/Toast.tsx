import clsx from 'clsx';
import React from 'react';
import {Toast as HotToast, ToastOptions, toast} from 'react-hot-toast';
import Icon from './Icon';

export type ToastType = 'neutral' | 'info' | 'success' | 'error' | 'pageError';

export interface ShowToastProps {
    title?: string;
    message?: React.ReactNode;
    type?: ToastType;
    icon?: React.ReactNode | string;
    options?: ToastOptions
}

export interface ToastProps {
    t: HotToast;

    /**
     * Can be a name of an icon from the icon library or a react component
     */
    children?: React.ReactNode;
    props?: ShowToastProps;
}

/**
 * This component uses `react-hot-toast` which requires the `<Toaster />` component to be included in the app.
 * The design system already does this so you don't have to — just call `showToast()` in any event and it'll work.
 */
const Toast: React.FC<ToastProps> = ({
    t,
    children,
    props
}) => {
    let iconColorClass = 'text-grey-500';

    switch (props?.type) {
    case 'info':
        props.icon = props.icon || 'info-fill';
        iconColorClass = 'text-grey-500';
        break;
    case 'success':
        props.icon = props.icon || 'success-fill';
        iconColorClass = 'text-green';
        break;
    case 'error':
        props.icon = props.icon || 'error-fill';
        iconColorClass = 'text-red';
        break;
    }

    const classNames = clsx(
        'z-[90] flex items-start justify-between gap-6 rounded bg-white px-4 py-3 text-sm font-medium text-black shadow-md-strong',
        (props?.type === 'success' || props?.type === 'neutral' || props?.type === 'info') && 'w-[360px] dark:bg-grey-950',
        props?.type === 'error' && 'w-[360px]',
        props?.options?.position === 'top-center' && 'w-[520px] max-w-[520px]',
        t.visible ? (props?.options?.position === 'top-center' ? 'animate-toaster-top-in' : 'animate-toaster-in') : 'animate-toaster-out'
    );

    return (
        <div className={classNames} data-testid={`toast-${props?.type}`}>
            <div className='flex items-start gap-3'>
                {props?.icon && (typeof props.icon === 'string' ?
                    <div className='mt-0.5'><Icon className='grow' colorClass={iconColorClass} name={props.icon} size='sm' /></div> : props.icon)}
                {children}
            </div>
            <button className='-mr-1.5 -mt-1.5 cursor-pointer p-2' type='button' onClick={() => {
                toast.dismiss(t.id);
            }}>
                <div className='mt-1'>
                    <Icon colorClass='text-black stroke-2' name='close' size='2xs' />
                </div>
            </button>
        </div>
    );
};

export default Toast;

export const showToast = ({
    title,
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
            <div>
                {title && <div className='text-md font-semibold'>{title}</div>}
                <div>{message}</div>
            </div>
        </Toast>
    ),
    {
        ...options
    }
    );
};

export const dismissAllToasts = (): void => {
    toast.dismiss();
};
