import React from 'react';
import { DynamicIcon } from 'lucide-react/dynamic';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { appBrandColor } from '@/apps/lib/brand-color';
import { toIconName } from '@/apps/lib/icons';

interface AppIconProps {
  /** A Lucide icon name from the app's manifest. */
  icon?: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  /** `brand` is the app's coloured tile, used in the Apps list and install dialog. */
  tone?: 'neutral' | 'brand';
  /** The manifest's brand colour; the `brand` tile falls back to Ghost green. */
  color?: string;
  className?: string;
}

/**
 * The band an app's icon sits into on its card and install dialog: the tile's
 * own colour, with the tile's white ring keeping the two apart.
 */
export const AppBanner: React.FC<{ className?: string; color?: string }> = ({
  className,
  color,
}) => (
  <div aria-hidden="true" className={className} style={{ backgroundColor: appBrandColor(color) }} />
);

const ICON_SIZES = { sm: 'size-3.5', md: 'size-[18px]', lg: 'size-6', xl: 'size-7' };

/** Apps share one neutral tile so the list reads as Ghost, not as a patchwork. */
export const AppIcon: React.FC<AppIconProps> = ({
  icon,
  size = 'md',
  tone = 'neutral',
  color,
  className,
}) => {
  const name = toIconName(icon);
  const fallback = () => <LucideIcon.AppWindow className={ICON_SIZES[size]} strokeWidth={1.5} />;

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md',
        tone === 'brand' ? 'text-white' : 'bg-muted text-muted-foreground',
        { sm: 'size-6 rounded-sm', md: 'size-10', lg: 'size-12', xl: 'size-16 rounded-xl' }[size],
        className,
      )}
      style={tone === 'brand' ? { backgroundColor: appBrandColor(color) } : undefined}
    >
      {name ? (
        <DynamicIcon
          className={ICON_SIZES[size]}
          fallback={fallback}
          name={name}
          strokeWidth={1.5}
        />
      ) : (
        fallback()
      )}
    </span>
  );
};
