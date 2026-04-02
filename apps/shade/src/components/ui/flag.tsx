import {cn} from '@/lib/utils';
import React from 'react';
import ReactFlag from 'react-world-flags';

interface FlagProps {
    width?: string;
    height?: string;
    className?: string;
    countryCode?: string;
    fallback?: React.ReactNode | null | undefined;
}

const Flag: React.FC<FlagProps> = ({
    className,
    countryCode,
    width = '22px',
    height = '14px',
    fallback
}) => {
    const sizeStyle = {
        width: width,
        height: height
    };

    return (
        <div className={cn('relative flex items-center justify-center overflow-hidden rounded-[2px]', className)} style={sizeStyle}>
            <ReactFlag
                className='absolute w-auto max-w-none rounded-[2px]'
                code={`${countryCode}`}
                fallback={fallback || <span className='h-[14px] w-[22px] rounded-[2px] bg-muted-foreground/20' style={sizeStyle}></span>}
                style={{
                    height: height
                }} />
        </div>
    );
};

export {Flag};