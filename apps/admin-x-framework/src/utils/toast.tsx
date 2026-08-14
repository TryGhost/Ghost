import React from 'react';
import toast from 'react-hot-toast';

// Markup, classes and icons are copied from admin-x-design-system's Toast so error
// toasts render identically inside its react-hot-toast <Toaster>.
const ErrorIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
        <path d='m23.77 20.57 -10 -19A2 2 0 0 0 12 0.5a2 2 0 0 0 -1.77 1.07l-10 19a2 2 0 0 0 0.06 2A2 2 0 0 0 2 23.5h20a2 2 0 0 0 1.77 -2.93ZM11 8.5a1 1 0 0 1 2 0v6a1 1 0 0 1 -2 0ZM12.05 20a1.53 1.53 0 0 1 -1.52 -1.47A1.48 1.48 0 0 1 12 17a1.53 1.53 0 0 1 1.52 1.47A1.48 1.48 0 0 1 12.05 20Z' fill='currentColor' />
    </svg>
);

const CloseIcon: React.FC<{className?: string}> = ({className}) => (
    <svg className={className} viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
        <line fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' x1='0.75' x2='23.25' y1='23.249' y2='0.749' />
        <line fill='none' stroke='currentColor' strokeLinecap='round' strokeLinejoin='round' strokeWidth='1.5' x1='23.25' x2='0.75' y1='23.249' y2='0.749' />
    </svg>
);

export interface ShowToastProps {
    message: React.ReactNode;
    type: 'error';
}

export const showToast = ({message, type}: ShowToastProps): void => {
    toast.custom(t => (
        <div
            className={`relative z-[90] mb-[14px] ml-[6px] flex min-w-[272px] max-w-[320px] items-start justify-between gap-3 rounded-lg bg-white p-4 text-black shadow-md-heavy dark:bg-grey-900 dark:text-white ${t.visible ? 'animate-toaster-in' : 'animate-toaster-out'}`}
            data-testid={`toast-${type}`}
        >
            <div className='mr-7 flex items-start gap-[10px]'>
                <div className='mt-px'>
                    <ErrorIcon className='pointer-events-none size-4 grow text-red' />
                </div>
                <div>
                    <div className='text-grey-900 dark:text-grey-300'>{message}</div>
                </div>
            </div>
            <button
                className='absolute top-5 right-5 -mt-1.5 -mr-1.5 cursor-pointer rounded-full p-2 text-grey-700 hover:text-black dark:hover:text-white'
                type='button'
                onClick={() => toast.dismiss(t.id)}
            >
                <div>
                    <CloseIcon className='pointer-events-none size-2 stroke-2' />
                </div>
            </button>
        </div>
    ), {position: 'bottom-left', duration: 5000});
};
