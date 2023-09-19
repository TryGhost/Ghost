import React from 'react';
import clsx from 'clsx';

interface BannerProps {
    color?: 'grey' | 'blue' | 'green' | 'yellow' | 'red';
    children?: React.ReactNode;
    className?: string;
}

const Banner: React.FC<BannerProps> = ({color = 'grey', children, className}) => {
    const bannerClasses = clsx(
        'relative overflow-hidden rounded-sm p-2',
        color === 'grey' && 'text-black',
        color === 'blue' && 'text-blue',
        color === 'green' && 'text-green',
        color === 'yellow' && 'text-yellow',
        color === 'red' && 'text-red',

        `before:absolute before:inset-0 before:block before:opacity-10 before:content-['']`,
        color === 'grey' && 'before:bg-grey-500',
        color === 'blue' && 'before:bg-blue',
        color === 'green' && 'before:bg-green',
        color === 'yellow' && 'before:bg-yellow',
        color === 'red' && 'before:bg-red',

        className
    );

    return (
        <div className={bannerClasses}>
            {children}
        </div>
    );
};

export default Banner;