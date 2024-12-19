import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';

type TabsVariant = 'segmented' | 'page';

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
                page: ''
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
    'inline-flex items-center justify-center text-muted-foreground',
    {
        variants: {
            variant: {
                segmented: 'h-[34px] rounded-lg bg-muted px-[3px]',
                page: 'gap-2 border-b pb-2'
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
    'inline-flex items-center justify-center whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium ring-offset-background transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground',
    {
        variants: {
            variant: {
                segmented: 'h-7 data-[state=active]:shadow-md',
                page: 'h-[34px] border data-[state=active]:bg-muted/70'
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
    'mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    {
        variants: {
            variant: {
                segmented: '',
                page: ''
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
