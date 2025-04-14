import * as React from 'react';
import {cn} from '@/lib/utils';
import {cva} from 'class-variance-authority';

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
                outline: 'rounded-xl border',
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
                outline: 'px-6 py-5',
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
        className={cn('text-lg tracking-tight font-semibold leading-none', className)}
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

export {Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants};
