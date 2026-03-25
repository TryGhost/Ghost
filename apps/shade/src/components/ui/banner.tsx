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
                    'shadow-[-7px_-6px_42px_8px_rgb(75_225_226_/_28%),7px_6px_42px_8px_rgb(202_103_255_/_32%)]',
                    'dark:shadow-[-7px_-6px_42px_8px_rgb(75_225_226_/_36%),7px_6px_42px_8px_rgb(202_103_255_/_38%)]',
                    'hover:shadow-[-7px_-4px_42px_10px_rgb(75_225_226_/_38%),7px_8px_42px_10px_rgb(202_103_255_/_42%)]',
                    'dark:hover:shadow-[-7px_-4px_42px_10px_rgb(75_225_226_/_50%),7px_8px_42px_10px_rgb(202_103_255_/_52%)]',
                    'hover:translate-y-[-2px] hover:scale-[1.01]'
                ],
                info: 'border border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/30',
                success: 'border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30',
                warning: 'border border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/30',
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
                        className="absolute top-1 right-1 size-8 text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
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
