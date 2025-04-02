import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';

type TabsVariant = 'segmented' | 'button' | 'underline';

const TabsVariantContext = React.createContext<TabsVariant>('segmented');

export interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
    variant?: TabsVariant;
}

const tabsVariants = cva(
    '',
    {
        variants: {
            variant: {
                segmented: '',
                button: '',
                underline: ''
            }
        },
        defaultVariants: {
            variant: 'segmented'
        }
    }
);

const Tabs = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Root>,
    TabsProps
>(({variant = 'segmented', ...props}, ref) => (
    <TabsVariantContext.Provider value={variant}>
        <TabsPrimitive.Root ref={ref} {...props} />
    </TabsVariantContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

const tabsListVariants = cva(
    'inline-flex items-center text-muted-foreground',
    {
        variants: {
            variant: {
                segmented: 'h-[34px] rounded-lg bg-muted px-[3px]',
                button: 'gap-2',
                underline: 'gap-7 border-b pb-1'
            }
        },
        defaultVariants: {
            variant: 'segmented'
        }
    }
);

const TabsList = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.List>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({className, ...props}, ref) => {
    const variant = React.useContext(TabsVariantContext);
    return (
        <TabsPrimitive.List
            ref={ref}
            className={cn(tabsListVariants({variant, className}))}
            {...props}
        />
    );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const tabsTriggerVariants = cva(
    'inline-flex items-center justify-center whitespace-nowrap px-3 py-1 ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground [&_svg]:size-4 [&_svg]:shrink-0',
    {
        variants: {
            variant: {
                segmented: 'h-7 rounded-md text-sm font-medium data-[state=active]:shadow-md',
                button: 'h-[34px] gap-1.5 rounded-md border border-input py-2 text-sm font-medium hover:bg-muted/50 data-[state=active]:bg-muted/70 data-[state=active]:font-semibold',
                underline: 'relative h-[34px] px-0 text-md font-semibold text-gray-700 data-[state=active]:text-black data-[state=active]:after:absolute data-[state=active]:after:inset-x-0 data-[state=active]:after:bottom-[-5px] data-[state=active]:after:h-0.5 data-[state=active]:after:bg-black data-[state=active]:after:content-[""]'
            }
        },
        defaultVariants: {
            variant: 'segmented'
        }
    }
);

const TabsTrigger = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Trigger>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({className, ...props}, ref) => {
    const variant = React.useContext(TabsVariantContext);
    return (
        <TabsPrimitive.Trigger
            ref={ref}
            className={cn(tabsTriggerVariants({variant, className}))}
            {...props}
        />
    );
});
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const tabsContentVariants = cva(
    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    {
        variants: {
            variant: {
                segmented: '',
                button: '',
                underline: ''
            }
        },
        defaultVariants: {
            variant: 'segmented'
        }
    }
);

const TabsContent = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Content>,
    React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({className, ...props}, ref) => {
    const variant = React.useContext(TabsVariantContext);
    return (
        <TabsPrimitive.Content
            ref={ref}
            className={cn(tabsContentVariants({variant, className}))}
            {...props}
        />
    );
});
TabsContent.displayName = TabsPrimitive.Content.displayName;

export {Tabs, TabsList, TabsTrigger, TabsContent, tabsVariants};
