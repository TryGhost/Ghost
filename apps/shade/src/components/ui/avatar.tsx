import * as React from 'react';
import * as AvatarPrimitive from '@radix-ui/react-avatar';
import { User } from 'lucide-react';

import { cn } from '@/lib/utils';
import { stringToHslColor } from '@/lib/ds-utils';

const AvatarImage = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Image>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Image>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Image
    ref={ref}
    className={cn('aspect-square size-full', className)}
    {...props}
  />
));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;

const AvatarFallback = React.forwardRef<
  React.ElementRef<typeof AvatarPrimitive.Fallback>,
  React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Fallback>
>(({ className, ...props }, ref) => (
  <AvatarPrimitive.Fallback
    ref={ref}
    className={cn(
      'flex size-full items-center justify-center rounded-full bg-muted [&_svg]:size-4',
      className,
    )}
    {...props}
  />
));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;

// Gravatar's `d=blank` parameter returns a 1×1 transparent PNG when no avatar
// exists for the given email. The HTTP response is 200, so Radix's AvatarImage
// would treat it as a valid image and hide the fallback. We render the image
// ourselves and only reveal it once it loads with non-trivial dimensions.
function ValidatedAvatarImage({ src }: { src: string }) {
  const [loaded, setLoaded] = React.useState(false);

  React.useEffect(() => {
    setLoaded(false);
  }, [src]);

  return (
    <img
      alt=""
      className={cn('absolute inset-0 size-full object-cover', !loaded && 'invisible')}
      src={src}
      onLoad={(e) => {
        const { naturalWidth, naturalHeight } = e.currentTarget;
        if (naturalWidth > 1 && naturalHeight > 1) {
          setLoaded(true);
        }
      }}
    />
  );
}

interface AvatarProps extends React.ComponentPropsWithoutRef<typeof AvatarPrimitive.Root> {
  src?: string | null;
  initials?: string | null;
  /**
   * Seeds the fallback background hue. Defaults to the initials, but callers
   * should pass the richer identity string they derived the initials from
   * (name/email) so distinct people keep distinct hues.
   */
  colorSeed?: string | null;
}

const Avatar = React.forwardRef<React.ElementRef<typeof AvatarPrimitive.Root>, AvatarProps>(
  ({ className, children, src, initials, colorSeed, ...props }, ref) => {
    const hasInitials = !!initials;
    const bgColor = hasInitials ? stringToHslColor(colorSeed || initials, '45', '55') : undefined;

    return (
      <AvatarPrimitive.Root
        ref={ref}
        className={cn('relative flex size-8 shrink-0 overflow-hidden rounded-full', className)}
        {...props}
      >
        {children ?? (
          <>
            <AvatarFallback
              className={cn(
                'text-xs text-muted-foreground md:text-sm [&_svg]:size-3 md:[&_svg]:size-4',
                hasInitials && 'font-semibold text-white',
              )}
              style={hasInitials ? { backgroundColor: bgColor } : undefined}
            >
              {initials ?? <User />}
            </AvatarFallback>
            {src && <ValidatedAvatarImage src={src} />}
          </>
        )}
      </AvatarPrimitive.Root>
    );
  },
);
Avatar.displayName = AvatarPrimitive.Root.displayName;

export { Avatar, AvatarImage, AvatarFallback };
