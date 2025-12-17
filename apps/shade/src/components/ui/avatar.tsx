import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import {cva, type VariantProps} from 'class-variance-authority';

import {cn} from '@/lib/utils';

const avatarVariants = cva(
    'relative flex shrink-0 overflow-hidden rounded-full',
    {
        variants: {
            size: {
                xs: 'size-4',
                sm: 'size-6',
                default: 'size-8',
                lg: 'size-10',
                xl: 'size-12'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
);

export interface AvatarProps
    extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root>,
        VariantProps<typeof avatarVariants> {}

const Avatar = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Root>,
    AvatarProps
>(({className, size, ...props}, ref) => (
    <AvatarPrimitive.Root
        ref={ref}
        className={cn(avatarVariants({size}), className)}
        {...props}
    />
));
Avatar.displayName = AvatarPrimitive.Root.displayName;

const AvatarImage = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Image>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({className, ...props}, ref) => (
    <AvatarPrimitive.Image
        ref={ref}
        className={cn('aspect-square h-full w-full', className)}
        {...props}
    />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const avatarFallbackVariants = cva(
    'flex size-full items-center justify-center rounded-full bg-muted',
    {
        variants: {
            size: {
                xs: 'text-[8px] [&_svg]:size-2',
                sm: 'text-[10px] [&_svg]:size-3',
                default: 'text-xs [&_svg]:size-4',
                lg: 'text-sm [&_svg]:size-5',
                xl: 'text-base [&_svg]:size-6'
            }
        },
        defaultVariants: {
            size: 'default'
        }
    }
);

export interface AvatarFallbackProps
    extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>,
        VariantProps<typeof avatarFallbackVariants> {}

const AvatarFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Fallback>,
    AvatarFallbackProps
>(({className, size, ...props}, ref) => (
    <AvatarPrimitive.Fallback
        ref={ref}
        className={cn(avatarFallbackVariants({size}), className)}
        {...props}
    />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

export {Avatar, AvatarImage, AvatarFallback, avatarVariants, avatarFallbackVariants};
