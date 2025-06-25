import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';

import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';
import {TrendingDown, TrendingUp, type LucideIcon} from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import {Button, ButtonProps} from './button';

type TabsVariant = 'segmented' | 'segmented-sm' | 'button' | 'button-sm' | 'underline' | 'navbar' | 'pill' | 'kpis';

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
                'segmented-sm': '',
                button: '',
                'button-sm': '',
                underline: '',
                navbar: '',
                pill: '',
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
                'segmented-sm': 'h-8 rounded-lg bg-muted px-[3px]',
                button: 'gap-2',
                'button-sm': 'gap-1',
                underline: 'w-full gap-5 border-b border-b-gray-200 dark:border-gray-950',
                navbar: 'h-[52px] items-end gap-6',
                pill: '-ml-0.5 h-[30px] gap-px',
                kpis: 'border-b ring-0'
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
                'segmented-sm': 'h-[26px] rounded-md text-xs font-medium data-[state=active]:shadow-md',
                button: 'h-[34px] gap-1.5 rounded-md py-2 text-sm font-normal hover:bg-muted data-[state=active]:bg-muted-foreground/15 data-[state=active]:font-medium',
                'button-sm': 'font-regular h-6 gap-1.5 rounded-md p-2 text-xs text-gray-800 hover:bg-muted data-[state=active]:bg-muted-foreground/15 data-[state=active]:font-medium data-[state=active]:text-foreground',
                underline: 'relative h-[36px] px-0 text-md font-semibold text-gray-700 after:absolute after:inset-x-0 after:bottom-[-1px] after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] hover:after:opacity-10 data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:after:!opacity-100',
                navbar: 'relative h-[52px] px-px text-md font-semibold text-muted-foreground after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] hover:text-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:after:!opacity-100',
                pill: 'relative h-[30px] rounded-md px-3 text-md font-medium text-gray-800 hover:text-foreground data-[state=active]:bg-muted-foreground/15 data-[state=active]:font-semibold data-[state=active]:text-foreground dark:text-gray-500 dark:data-[state=active]:text-foreground',
                kpis: 'relative rounded-none border-border bg-transparent px-6 py-5 text-foreground ring-0 transition-all after:absolute after:inset-x-0 after:-bottom-px after:h-0.5 after:bg-foreground after:opacity-0 after:content-[""] first:rounded-tl-md last:rounded-tr-md hover:bg-accent/50 data-[state=active]:bg-transparent data-[state=active]:after:opacity-100 [&:not(:last-child)]:border-r [&[data-state=active]_[data-type="value"]]:text-foreground'
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

interface TabsTriggerCountProps {
    children: React.ReactNode;
    className?: string;
}

const TabsTriggerCount: React.FC<TabsTriggerCountProps> = ({className = '', children}) => {
    return (
        <span className={`ml-1.5 mt-px flex h-5 items-center justify-center rounded-full bg-gray-200 px-1.5 py-0 text-xs font-semibold leading-[21px] text-gray-800 dark:bg-gray-900 dark:text-gray-300 ${className}`}>{children}</span>
    );
};
TabsTriggerCount.displayName = 'TabsTriggerCount';

const tabsContentVariants = cva(
    'ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    {
        variants: {
            variant: {
                segmented: '',
                'segmented-sm': '',
                button: '',
                'button-sm': '',
                underline: '',
                navbar: '',
                pill: '',
                kpis: 'ring-0'
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
    color?: string;
    icon?: keyof typeof LucideIcons;
    label: string;
    value: string | number;
    diffDirection?: 'up' | 'down' | 'same' | 'hidden';
    diffValue?: string | number;
    className?: string;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({
    color,
    icon: iconName,
    label,
    value,
    diffDirection,
    diffValue,
    className
}) => {
    const IconComponent = iconName ? LucideIcons[iconName] as LucideIcon : null;

    const diffContainerClassName = cn(
        'flex items-center gap-1 text-xs h-[22px] px-1.5 rounded-sm group/diff cursor-default mt-0.5',
        diffDirection === 'up' && 'text-green-600 bg-green/10',
        diffDirection === 'down' && 'text-red-600 bg-red/10',
        diffDirection === 'same' && 'text-gray-700 bg-muted'
    );
    return (
        <div className={cn('group flex w-full flex-col items-start gap-2', className)}>
            <div className='flex h-[22px] items-center gap-1.5 text-base font-medium text-muted-foreground transition-all group-hover:text-foreground' data-type="value">
                {color && <div className='ml-1 size-2 rounded-full opacity-50' style={{backgroundColor: color}}></div>}
                {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
                {label}
            </div>
            <div className='flex flex-col items-start gap-2 xl:flex-row xl:gap-3'>
                <div className='text-[2.3rem] font-semibold leading-none tracking-tighter xl:text-[2.6rem]'>
                    {value}
                </div>
                {diffDirection && diffDirection !== 'hidden' &&
                    <>
                        <div className={diffContainerClassName}>
                            <span className='font-medium leading-none'>{diffValue}</span>
                            {diffDirection === 'up' &&
                                <TrendingUp className='!size-[12px]' size={14} strokeWidth={2} />
                            }
                            {diffDirection === 'down' &&
                                <TrendingDown className='!size-[12px]' size={14} strokeWidth={2} />
                            }
                        </div>
                    </>
                }
            </div>
        </div>
    );
};

interface KpiDropdownButtonProps extends ButtonProps {
    className?: string;
    children: React.ReactNode;
}

const KpiDropdownButton = React.forwardRef<HTMLButtonElement, KpiDropdownButtonProps>(
    ({variant = 'dropdown', className, ...props}, ref) => {
        return (
            <Button
                ref={ref}
                className={
                    cn(
                        'h-auto w-full rounded-none border-x-0 border-t-0 focus-visible:ring-0 bg-transparent py-5',
                        className
                    )
                }
                variant={variant}
                {...props}
            />
        );
    }
);
KpiDropdownButton.displayName = 'KpiDropdownButton';

export {Tabs, TabsList, TabsTrigger, TabsTriggerCount, TabsContent, KpiTabTrigger, KpiTabValue, KpiDropdownButton, tabsVariants};
