import React from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

/**
 * An icon Admin ships, by its Lucide name such as `audio-lines`. Admin already includes
 * every Lucide icon, so looking one up by name adds nothing to the bundle.
 */
function namedIcon(name: string): LucideIcon.LucideIcon | undefined {
  const key = name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('') as keyof typeof LucideIcon.icons;
  return Object.hasOwn(LucideIcon.icons, key) ? LucideIcon.icons[key] : undefined;
}

const TILE_SIZES = { md: 'size-10', lg: 'size-12', xl: 'size-16 rounded-xl' };
const GLYPH_SIZES = { md: 'size-[18px]', lg: 'size-6', xl: 'size-7' };

interface AppIconProps {
  manifest: Pick<AppManifest, 'icon' | 'accent_color'>;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}

/**
 * An app's icon, drawn by Ghost on the app's accent color: an icon Admin ships, by name, or
 * an SVG the app serves, shown as an image and never inlined. A name Admin doesn't know
 * falls back to a default.
 */
export const AppIcon: React.FC<AppIconProps> = ({ manifest, size = 'md', className }) => {
  const { icon, accent_color: color } = manifest;
  const glyph = GLYPH_SIZES[size];
  const Named = 'name' in icon ? namedIcon(icon.name) : undefined;

  let content: React.ReactNode;
  if ('url' in icon) {
    content = <img alt="" className={glyph} src={icon.url} />;
  } else {
    const Glyph = Named ?? LucideIcon.AppWindow;
    content = <Glyph className={glyph} strokeWidth={1.5} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center rounded-md text-white',
        TILE_SIZES[size],
        className,
      )}
      style={{ backgroundColor: color }}
    >
      {content}
    </span>
  );
};

/** The band an app's icon sits into at the top of the install screen, in its accent color. */
export const AppBanner: React.FC<{ className?: string; color: string }> = ({
  className,
  color,
}) => <div aria-hidden="true" className={className} style={{ backgroundColor: color }} />;
