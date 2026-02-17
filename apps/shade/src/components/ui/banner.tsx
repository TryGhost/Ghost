import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';
import {X} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from './button';

const bannerVariants = cva(
    'relative block rounded-lg transition-all duration-300',
    {
        variants: {
            variant: {
                default: 'border border-border bg-background shadow-sm hover:shadow-md dark:border-gray-900 dark:bg-gray-925',
                gradient: [
                    'cursor-pointer border border-gray-100 bg-white dark:border-gray-950 dark:bg-black',
                    'shadow-[rgb(75_225_226_/_28%)_-7px_-6px_42px_8px,rgb(202_103_255_/_32%)_7px_6px_42px_8px]',
                    'dark:shadow-[rgb(75_225_226_/_36%)_-7px_-6px_42px_8px,rgb(202_103_255_/_38%)_7px_6px_42px_8px]',
                    'hover:shadow-[rgb(75_225_226_/_38%)_-7px_-4px_42px_10px,rgb(202_103_255_/_42%)_7px_8px_42px_10px]',
                    'dark:hover:shadow-[rgb(75_225_226_/_50%)_-7px_-4px_42px_10px,rgb(202_103_255_/_52%)_7px_8px_42px_10px]',
                    'hover:translate-y-[-2px] hover:scale-[1.01]'
                ],
                info: 'bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800 border',
                success: 'bg-green-50 border-green-200 dark:bg-green-950/30 dark:border-green-800 border',
                warning: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-950/30 dark:border-yellow-800 border',
                destructive: 'bg-white shadow-sm dark:bg-gray-950'
            },
            size: {
                sm: 'p-2 text-sm',
                md: 'p-3',
                lg: 'p-4'
            }
        },
        defaultVariants: {
            variant: 'default',
            size: 'md'
        }
    }
);

interface BannerBaseProps
    extends Omit<React.HTMLAttributes<HTMLDivElement>, 'role'>,
    VariantProps<typeof bannerVariants> {
    /**
     * Semantic role of the banner
     * @default 'status'
     *
     * Note: role="status" has implicit aria-live="polite"
     *       role="alert" has implicit aria-live="assertive"
     *       role="region" requires aria-label
     */
    role?: 'status' | 'alert' | 'region';
}

export type BannerProps = BannerBaseProps & (
    | { dismissible: true; onDismiss: () => void; }
    | { dismissible?: false; onDismiss?: never; }
);

const Banner = React.forwardRef<HTMLDivElement, BannerProps>(
    (props, ref) => {
        // onDismiss must be destructured to prevent React warning about invalid DOM props
        const {
            variant,
            size,
            dismissible = false,
            onDismiss,
            role = 'status',
            className,
            children,
            ...restProps
        } = props;

        const handleDismiss = (e: React.MouseEvent) => {
            e.preventDefault();
            e.stopPropagation();
            if (dismissible && onDismiss) {
                onDismiss();
            }
        };

        return (
            <div
                ref={ref}
                className={cn(bannerVariants({variant, size}), className)}
                role={role}
                {...restProps}
            >
                {dismissible && (
                    <Button
                        aria-label="Dismiss notification"
                        className="absolute right-1 top-1 size-8 text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
                        size="icon"
                        variant="ghost"
                        onClick={handleDismiss}
                    >
                        <X className="size-5" />
                    </Button>
                )}
                {children}
            </div>
        );
    }
);

Banner.displayName = 'Banner';

export {Banner, bannerVariants};
