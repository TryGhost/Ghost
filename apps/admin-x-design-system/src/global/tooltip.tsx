import * as TooltipPrimitive from '@radix-ui/react-tooltip';
import clsx from 'clsx';
import React from 'react';

export interface TooltipProps {
    content?: React.ReactNode;
    size?: 'sm' | 'md';
    children?: React.ReactNode;
    containerClassName?: string;
    tooltipClassName?: string;
    origin?: 'start' | 'center' | 'end'
}

const Tooltip: React.FC<TooltipProps> = ({content, size = 'sm', children, containerClassName, tooltipClassName, origin = 'center'}) => {
    containerClassName = clsx(
        'will-change-[opacity]',
        containerClassName
    );

    tooltipClassName = clsx(
        'z-[9999] select-none rounded-sm bg-black px-2 py-0.5 leading-normal text-white will-change-[transform,opacity]',
        size === 'sm' && 'text-xs',
        size === 'md' && 'text-sm'
    );

    return (
        <TooltipPrimitive.Provider delayDuration={0}>
            <TooltipPrimitive.Root>
                <TooltipPrimitive.Trigger className={containerClassName} onClick={event => event.preventDefault()}>
                    {children}
                </TooltipPrimitive.Trigger>
                <TooltipPrimitive.Content align={origin} className={tooltipClassName} sideOffset={4} onPointerDownOutside={event => event.preventDefault()}>
                    {content}
                </TooltipPrimitive.Content>
            </TooltipPrimitive.Root>
        </TooltipPrimitive.Provider>
    );
};

export default Tooltip;
