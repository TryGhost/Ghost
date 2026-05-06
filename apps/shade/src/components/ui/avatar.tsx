import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import {User} from 'lucide-react';

import {cn} from '@/lib/utils';
import {stringToHslColor} from '@/lib/ds-utils';
import {formatMemberName, getMemberInitials} from '@/lib/app-utils';

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

const AvatarFallback = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Fallback>,
    React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({className, ...props}, ref) => (
    <AvatarPrimitive.Fallback
        ref={ref}
        className={cn(
            'flex h-full w-full items-center justify-center rounded-full bg-muted [&_svg]:size-4',
            className
        )}
        {...props}
    />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Gravatar's `d=blank` parameter returns a 1×1 transparent PNG when no avatar
// exists for the given email. The HTTP response is 200, so Radix's AvatarImage
// would treat it as a valid image and hide the fallback. We render the image
// ourselves and only reveal it once it loads with non-trivial dimensions.
function ValidatedAvatarImage({src}: {src: string}) {
    const [loaded, setLoaded] = React.useState(false);

    React.useEffect(() => {
        setLoaded(false);
    }, [src]);

    return (
        <img
            alt=""
            className={cn(
                'absolute inset-0 h-full w-full object-cover',
                !loaded && 'invisible'
            )}
            src={src}
            onLoad={(e) => {
                const {naturalWidth, naturalHeight} = e.currentTarget;
                if (naturalWidth > 1 && naturalHeight > 1) {
                    setLoaded(true);
                }
            }}
        />
    );
}

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
    src?: string | null;
    name?: string | null;
    email?: string | null;
}

const Avatar = React.forwardRef<
    React.ElementRef<typeof AvatarPrimitive.Root>,
    AvatarProps
>(({className, children, src, name, email, ...props}, ref) => {
    const identity = {name: name || undefined, email: email || undefined};
    const hasIdentity = !!(name || email);
    const initials = hasIdentity ? getMemberInitials(identity) : null;
    const bgColor = hasIdentity ? stringToHslColor(formatMemberName(identity), '75', '55') : undefined;

    return (
        <AvatarPrimitive.Root
            ref={ref}
            className={cn(
                'relative flex h-8 w-8 shrink-0 overflow-hidden rounded-full',
                className
            )}
            {...props}
        >
            {children ?? (
                <>
                    <AvatarFallback
                        className={cn(
                            'text-xs text-muted-foreground md:text-sm [&_svg]:size-3 md:[&_svg]:size-4',
                            hasIdentity && 'font-semibold text-white'
                        )}
                        style={hasIdentity ? {backgroundColor: bgColor} : undefined}
                    >
                        {initials ?? <User />}
                    </AvatarFallback>
                    {src && <ValidatedAvatarImage src={src} />}
                </>
            )}
        </AvatarPrimitive.Root>
    );
});
Avatar.displayName = AvatarPrimitive.Root.displayName;

export {Avatar, AvatarImage, AvatarFallback};
