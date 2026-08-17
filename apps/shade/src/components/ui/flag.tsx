import {cn} from '@/lib/utils';
import React from 'react';
import {hasFlag} from 'country-flag-icons';
import * as Flags from 'country-flag-icons/react/3x2';

interface FlagProps {
    width?: string;
    height?: string;
    className?: string;
    countryCode?: string;
    fallback?: React.ReactNode | null | undefined;
}

type FlagComponent = React.ComponentType<React.SVGProps<SVGSVGElement>>;

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

    const code = countryCode ? countryCode.toUpperCase() : '';
    const FlagIcon = code && hasFlag(code) ? (Flags as Record<string, FlagComponent>)[code] : undefined;

    const defaultFallback = fallback || <span className='h-[14px] w-[22px] rounded-[2px] bg-muted-foreground/20' style={sizeStyle}></span>;

    return (
        <div className={cn('relative flex items-center justify-center overflow-hidden rounded-[2px]', className)} style={sizeStyle}>
            {FlagIcon
                ? (
                    <FlagIcon
                        className='absolute w-auto max-w-none rounded-[2px]'
                        style={{
                            height: height
                        }} />
                )
                : defaultFallback}
        </div>
    );
};

export {Flag};
