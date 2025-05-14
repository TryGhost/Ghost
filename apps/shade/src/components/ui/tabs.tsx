import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';
import {TrendingDown, TrendingUp} from 'lucide-react';

type TabsVariant = 'segmented' | 'button' | 'underline' | 'navbar' | 'kpis';

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
                underline: '',
                navbar: '',
                kpis: ''
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
                underline: 'gap-3 border-b pb-1',
                navbar: 'gap-0',
                kpis: 'border-b'
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
                underline: 'relative h-[34px] px-0 text-md font-semibold text-foreground/70 after:absolute after:inset-x-0 after:bottom-[-5px] after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] hover:text-foreground hover:after:opacity-10 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:after:!opacity-100',
                navbar: 'relative h-[60px] px-3 text-md font-semibold text-muted-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:after:!opacity-100',
                kpis: 'relative rounded-none border-border bg-transparent p-6 text-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] first:rounded-tl-md last:rounded-tr-md hover:bg-muted/50 data-[state=active]:after:opacity-100 [&:not(:last-child)]:border-r'
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
                underline: '',
                navbar: '',
                kpis: ''
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

interface KpiTabTriggerProps extends React.ComponentProps<typeof TabsTrigger> {
    children: React.ReactNode;
}

const KpiTabTrigger: React.FC<KpiTabTriggerProps> = ({children, ...props}) => {
    return (
        <TabsTrigger className='h-auto' {...props}>
            {children}
        </TabsTrigger>
    );
};

interface KpiTabValueProps {
    label: string;
    value: string | number;
    diffDirection?: 'up' | 'down' | 'same';
    diffValue?: string | number;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({label, value, diffDirection, diffValue}) => {
    const diffContainerClassName = cn(
        'hidden xl:!flex xl:!visible items-center gap-1 rounded-full px-1.5 text-[1.1rem] -mb-1 h-[18px]',
        diffDirection === 'up' && 'bg-green/15 text-green-600',
        diffDirection === 'down' && 'bg-red/10 text-red-600',
        diffDirection === 'same' && 'bg-gray-200 text-gray-700'
    );
    return (
        <div className='flex w-full flex-col items-start gap-2'>
            <div className='text-base font-medium tracking-tight text-gray-700'>
                {label}
            </div>
            <div className='flex flex-col items-start gap-1'>
                <div className='text-[2.0rem] font-semibold tracking-tight xl:text-[2.6rem] xl:tracking-[-0.04em]'>
                    {value}
                </div>
                {diffValue &&
                    <>
                        <div className={diffContainerClassName}>
                            {diffDirection === 'up' &&
                                <TrendingUp className='!size-[12px]' size={14} strokeWidth={2} />
                            }
                            {diffDirection === 'down' &&
                                <TrendingDown className='!size-[12px]' size={14} strokeWidth={2} />
                            }
                            <span className='font-medium leading-none'>{diffValue}</span>
                        </div>
                    </>
                }
            </div>
        </div>
    );
};

export {Tabs, TabsList, TabsTrigger, TabsContent, KpiTabTrigger, KpiTabValue, tabsVariants};
