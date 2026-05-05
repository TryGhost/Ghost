import * as React from 'react';
import * as LucideIcons from 'lucide-react';
import {type LucideIcon} from 'lucide-react';

import {cn} from '@/lib/utils';
import {Button, ButtonProps} from '../../ui/button';
import {MetricValue} from '../../ui/metric-value';
import {Tabs, TabsContent, TabsList, TabsProps, TabsTrigger} from '../../ui/tabs';
import {TrendBadge} from '../../ui/trend-badge';

/**
 * KPI variant of the Tabs primitives. Wraps the generic Tabs / TabsList /
 * TabsTrigger / TabsContent and pins the `kpis` cva variant so consumers don't
 * have to pass `variant='kpis'` themselves. The `kpis` cva variant lives in
 * `ui/tabs.tsx` as a private implementation detail used only here.
 */
const KpiTabs = React.forwardRef<
    React.ElementRef<typeof Tabs>,
    Omit<TabsProps, 'variant'>
>(({...props}, ref) => (
    <Tabs ref={ref} variant='kpis' {...props} />
));
KpiTabs.displayName = 'KpiTabs';

const KpiTabsList = React.forwardRef<
    React.ElementRef<typeof TabsList>,
    React.ComponentPropsWithoutRef<typeof TabsList>
>((props, ref) => (
    <TabsList ref={ref} {...props} />
));
KpiTabsList.displayName = 'KpiTabsList';

const KpiTabsContent = React.forwardRef<
    React.ElementRef<typeof TabsContent>,
    React.ComponentPropsWithoutRef<typeof TabsContent>
>((props, ref) => (
    <TabsContent ref={ref} {...props} />
));
KpiTabsContent.displayName = 'KpiTabsContent';

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
    'data-testid'?: string;
}

const KpiTabValue: React.FC<KpiTabValueProps> = ({
    color,
    icon: iconName,
    label,
    value,
    diffDirection,
    diffValue,
    className,
    'data-testid': testId
}) => {
    const IconComponent = iconName ? LucideIcons[iconName] as LucideIcon : null;

    const labelNode = (
        <span className='flex items-center gap-1.5 transition-all group-hover:text-foreground' data-type="value">
            {color && <div className='ml-1 size-2 rounded-full opacity-50' style={{backgroundColor: color}}></div>}
            {IconComponent && <IconComponent size={16} strokeWidth={1.5} />}
            {label}
        </span>
    );

    const trailing = diffDirection && diffDirection !== 'hidden' ? (
        <TrendBadge
            className='mt-0.5'
            data-testid={testId ? `${testId}-diff` : undefined}
            direction={diffDirection}
            value={diffValue ?? ''}
        />
    ) : null;

    return (
        <MetricValue
            className={cn('group', className)}
            label={labelNode}
            size='lg'
            trailing={trailing}
            value={value}
            valueTestId={testId}
        />
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

export {
    KpiTabs,
    KpiTabsList,
    KpiTabsContent,
    KpiTabTrigger,
    KpiTabValue,
    KpiDropdownButton
};
