import * as React from 'react';
import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';
import {MetricValue} from '@/components/ui/metric-value';
import {TrendBadge} from '@/components/ui/trend-badge';

type CardsVariant = 'outline' | 'plain';
const CardsVariantContext = React.createContext<CardsVariant>('outline');

export interface CardProps extends React.ComponentPropsWithoutRef<'div'> {
    variant?: CardsVariant;
}

const cardVariants = cva(
    'flex flex-col bg-card text-card-foreground',
    {
        variants: {
            variant: {
                outline: 'rounded-xl border transition-all hover:shadow-xs',
                plain: ''
            }
        },
        defaultVariants: {
            variant: 'outline'
        }
    }
);

const Card = React.forwardRef<
    HTMLDivElement,
    CardProps
>(({variant = 'outline', className, ...props}, ref) => (
    <CardsVariantContext.Provider value={variant}>
        <div
            ref={ref}
            className={cn(cardVariants({variant, className}))}
            {...props}
        />
    </CardsVariantContext.Provider>
));
Card.displayName = 'Card';

const cardHeaderVariants = cva(
    'flex flex-col gap-y-1.5',
    {
        variants: {
            variant: {
                outline: 'p-6',
                plain: 'border-b py-5'
            }
        },
        defaultVariants: {
            variant: 'outline'
        }
    }
);

const CardHeader = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => {
    const variant = React.useContext(CardsVariantContext);
    return (
        <div
            ref={ref}
            className={cn(cardHeaderVariants({variant, className}))}
            {...props}
        />
    );
});
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('tracking-tight font-semibold leading-none', className)}
        {...props}
    />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('text-sm text-muted-foreground', className)}
        {...props}
    />
));
CardDescription.displayName = 'CardDescription';

const cardContentVariants = cva(
    '',
    {
        variants: {
            variant: {
                outline: 'p-6 pt-0',
                plain: 'border-b'
            }
        },
        defaultVariants: {
            variant: 'outline'
        }
    }
);

const CardContent = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => {
    const variant = React.useContext(CardsVariantContext);
    return (
        <div ref={ref} className={cn(cardContentVariants({variant, className}))} {...props} />
    );
});
CardContent.displayName = 'CardContent';

const cardFooterVariants = cva(
    'flex w-full items-center',
    {
        variants: {
            variant: {
                outline: 'p-6 pt-0',
                plain: 'py-5'
            }
        },
        defaultVariants: {
            variant: 'outline'
        }
    }
);

const CardFooter = React.forwardRef<
    HTMLDivElement,
    React.HTMLAttributes<HTMLDivElement>
>(({className, ...props}, ref) => {
    const variant = React.useContext(CardsVariantContext);
    return (
        <div className='flex grow items-end'>
            <div
                ref={ref}
                className={cn(cardFooterVariants({variant, className}))}
                {...props}
            />
        </div>
    );
});
CardFooter.displayName = 'CardFooter';

const KpiCardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, ...props}) => {
    return (
        <div
            className={
                cn(
                    'flex flex-col border-r border-border last:border-none items-start gap-4 px-6 py-5 transition-all',
                    className
                )}
            {...props}
        >
            {children}
        </div>
    );
};

const KpiCardHeaderLabel: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({children, className, color, ...props}) => {
    return (
        <div className={cn('[&_svg]:size-4 flex items-center gap-1.5 text-base text-muted-foreground h-[22px] font-medium', className)} {...props}>
            {color && <div className='ml-1 size-2 rounded-full opacity-50' style={{backgroundColor: color}}></div>}
            {children}
        </div>
    );
};

interface KpiCardValueProps {
    value: string | number;
    diffDirection?: 'up' | 'down' | 'same' | 'empty' | 'hidden';
    diffValue?: string | number;
    diffTooltip?: React.ReactNode;
}

const KpiCardHeaderValue: React.FC<KpiCardValueProps> = ({value, diffDirection, diffValue, diffTooltip}) => {
    let adornment: React.ReactNode = null;
    if (diffDirection && diffDirection !== 'hidden') {
        if (diffDirection === 'empty') {
            // Reserves the same vertical space as a real trend badge without showing one.
            adornment = (
                <div
                    className='flex h-[22px] items-center px-1.5 text-xs leading-none font-medium'
                    data-testid='kpi-card-header-diff'
                >
                    {diffValue}
                </div>
            );
        } else {
            adornment = (
                <TrendBadge
                    data-testid='kpi-card-header-diff'
                    direction={diffDirection}
                    tooltip={diffTooltip}
                    value={diffValue ?? ''}
                />
            );
        }
    }
    return (
        <MetricValue
            adornment={adornment}
            value={value}
            valueTestId='kpi-card-header-value'
        />
    );
};

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export interface EmptyCardProps extends React.ComponentPropsWithoutRef<'div'> {}

const EmptyCard = React.forwardRef<
    HTMLDivElement,
    EmptyCardProps
>(({className, ...props}, ref) => (
    <div
        ref={ref}
        className={cn('p-6 transition-all hover:shadow-xs rounded-xl border flex flex-col bg-card text-card-foreground', className)}
        {...props}
    />
));
EmptyCard.displayName = 'EmptyCard';

export {
    Card,
    CardHeader,
    CardFooter,
    CardTitle,
    CardDescription,
    CardContent,
    KpiCardHeader,
    KpiCardHeaderLabel,
    KpiCardHeaderValue,
    EmptyCard,
    cardVariants
};
