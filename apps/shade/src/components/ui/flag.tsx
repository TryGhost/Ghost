import {cn} from '@/lib/utils';
import React from 'react';
import * as ReactWorldFlags from 'react-world-flags';

// react-world-flags is CommonJS shaped `{ __esModule: true, default: Component }`.
// esbuild/Rollup unwrap the default to the component; Rolldown returns the wrapper
// object (whose `.default` is still the wrapper), so unwrap explicitly. Works under
// both bundlers.
function interopDefault<T>(mod: unknown): T {
    let value: unknown = (mod && typeof mod === 'object' && 'default' in mod)
        ? (mod as {default: unknown}).default
        : mod;
    if (value && typeof value === 'object' && '__esModule' in value && 'default' in value) {
        value = (value as {default: unknown}).default;
    }
    return value as T;
}
const ReactFlag = interopDefault<React.ComponentType<Record<string, unknown>>>(ReactWorldFlags);

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