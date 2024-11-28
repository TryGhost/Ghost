import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';

// Add variant types
type TabsVariant = 'default' | 'bordered';

const TabsVariantContext = React.createContext<TabsVariant>('default');

interface TabsProps extends React.ComponentPropsWithoutRef<typeof TabsPrimitive.Root> {
    variant?: TabsVariant;
}

// Tabs
// -----------------------------------------------------------------------------
const Tabs = React.forwardRef<
    React.ElementRef<typeof TabsPrimitive.Root>,
    TabsProps
>(({variant = 'default', ...props}, ref) => (
    <TabsVariantContext.Provider value={variant}>
        <TabsPrimitive.Root ref={ref} {...props} />
    </TabsVariantContext.Provider>
));
Tabs.displayName = TabsPrimitive.Root.displayName;

// Tabs List
// -----------------------------------------------------------------------------
const tabsListVariants = cva(
    'inline-flex items-center justify-center bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400',
    {
        variants: {
            variant: {
                default: 'h-10 rounded-md bg-neutral-100 p-1 text-sm dark:bg-neutral-800',
                bordered: 'border-b border-neutral-200 bg-transparent text-[15px] dark:border-neutral-800'
            }
        },
        defaultVariants: {
            variant: 'default'
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

// Tabs Trigger
// -----------------------------------------------------------------------------
const tabsTriggerVariants = cva(
    'inline-flex items-center whitespace-nowrap font-medium ring-offset-white transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:font-semibold data-[state=active]:text-neutral-950',
    {
        variants: {
            variant: {
                default: 'justify-center rounded-sm px-3 py-1.5 data-[state=active]:bg-white data-[state=active]:shadow-sm dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300 dark:data-[state=active]:bg-neutral-950 dark:data-[state=active]:text-neutral-50',
                bordered: '-mb-px justify-start border-b-2 border-transparent p-2 data-[state=active]:border-neutral-950'
            }
        },
        defaultVariants: {
            variant: 'default'
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

// Tabs Content
// -----------------------------------------------------------------------------
const tabsContentVariants = cva(
    'mt-2 ring-offset-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-neutral-950 focus-visible:ring-offset-2 dark:ring-offset-neutral-950 dark:focus-visible:ring-neutral-300',
    {
        variants: {
            variant: {
                default: '',
                bordered: ''
            }
        },
        defaultVariants: {
            variant: 'default'
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

export {Tabs, TabsList, TabsTrigger, TabsContent};
