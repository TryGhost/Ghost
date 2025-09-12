import * as React from 'react';
import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';
import {TrendingDown, TrendingUp} from 'lucide-react';

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
    'flex flex-col space-y-1.5',
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
    const diffContainerClassName = cn(
        'flex items-center gap-1 text-xs h-[22px] px-1.5 rounded-sm group/diff cursor-default',
        diffDirection === 'up' && `text-green-600 bg-green/10 ${diffTooltip && 'hover:bg-green/20'}`,
        diffDirection === 'down' && `text-red-600 bg-red/10 ${diffTooltip && 'hover:bg-red/20'}`,
        diffDirection === 'same' && 'text-gray-700 bg-muted'
    );
    return (
        <div className='relative flex flex-col items-start gap-2 lg:flex-row lg:gap-3'>
            <div className='text-[2.2rem] font-semibold leading-none tracking-tighter' data-testid='kpi-card-header-value'>
                {value}
            </div>
            {diffDirection && diffDirection !== 'hidden' &&
            <>
                <div className={diffContainerClassName} data-testid='kpi-card-header-diff'>
                    <span className='font-medium leading-none'>{diffValue}</span>
                    {diffDirection === 'up' &&
                        <TrendingUp className='!size-[12px]' size={14} strokeWidth={2} />
                    }
                    {diffDirection === 'down' &&
                        <TrendingDown className='!size-[12px]' size={14} strokeWidth={2} />
                    }
                    {diffTooltip &&
                        <div className='pointer-events-none absolute inset-x-0 top-0 z-50 w-full max-w-[240px] -translate-y-full text-pretty rounded-sm bg-background px-3 py-2 text-sm text-foreground opacity-0 shadow-md transition-all group-hover/diff:translate-y-[calc(-100%-8px)] group-hover/diff:opacity-100'>
                            {diffTooltip}
                        </div>
                    }
                </div>
            </>
            }
        </div>
    );
};

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
