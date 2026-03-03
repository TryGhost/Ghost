import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import {SHADE_APP_NAMESPACES} from '@/shade-app';

import {cn} from '@/lib/utils';

const Popover = PopoverPrimitive.Root;

const PopoverTrigger = PopoverPrimitive.Trigger;

const PopoverAnchor = PopoverPrimitive.Anchor;

const PopoverClose = PopoverPrimitive.Close;

const PopoverContent = React.forwardRef<
  React.ElementRef<typeof PopoverPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof PopoverPrimitive.Content>
>(({className, align = 'center', sideOffset = 4, ...props}, ref) => (
    <PopoverPrimitive.Portal>
        <div className={SHADE_APP_NAMESPACES}>
            <PopoverPrimitive.Content
                ref={ref}
                align={align}
                className={cn(
                    'z-50 rounded-md bg-white dark:bg-gray-950 p-5 text-popover-foreground shadow-md border outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 origin-[--radix-popover-content-transform-origin]',
                    className
                )}
                sideOffset={sideOffset}
                {...props}
            />
        </div>
    </PopoverPrimitive.Portal>
));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;

export {Popover, PopoverTrigger, PopoverContent, PopoverAnchor, PopoverClose};
