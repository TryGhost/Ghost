import React from 'react';

export type LoadingIndicatorSize = 'sm' | 'md' | 'lg';
export type LoadingIndicatorColor = 'light' | 'dark';

export interface LoadingIndicatorProps {
    size?: LoadingIndicatorSize;
    color?: LoadingIndicatorColor;
    delay?: number;
    style?: React.CSSProperties;
};

export const LoadingIndicator: React.FC<LoadingIndicatorProps> = ({size, color, delay, style}) => {
    const [show, setShow] = React.useState(!delay);

    React.useEffect(() => {
        if (delay) {
            const timeout = setTimeout(() => {
                setShow(true);
            }, delay);
            return () => {
                clearTimeout(timeout);
            };
        }
    }, [delay]);

    let styles = `relative mx-0 my-[-0.5] box-border inline-block animate-spin rounded-full before:z-10 before:block before:rounded-full before:content-[''] `;

    switch (size) {
    case 'sm':
        styles += ' h-[16px] w-[16px] border-2 before:mt-[10px] before:h-[3px] before:w-[3px] ';
        break;
    case 'md':
        styles += ' h-[20px] w-[20px] border-2 before:mt-[13px] before:h-[3px] before:w-[3px] ';
        break;
    case 'lg':
    default:
        styles += ' h-[50px] w-[50px] border before:mt-[7px] before:h-[7px] before:w-[7px] ';
        break;
    }

    switch (color) {
    case 'light':
        styles += ' border-white/20 before:bg-white dark:border-black/10 dark:before:bg-black ';
        break;
    case 'dark':
    default:
        styles += ' border-black/10 before:bg-black dark:border-white/20 dark:before:bg-white ';
        break;
    }

    if (size === 'lg') {
        return (
            <div className={`flex h-64 items-center justify-center transition-opacity ${show ? 'opacity-100' : 'opacity-0'}`} style={style}>
                <div className={styles}></div>
            </div>
        );
    } else {
        return (
            <div className={styles}></div>
        );
    }
};
