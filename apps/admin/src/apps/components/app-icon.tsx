import React from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';

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

/** What an app's icon is drawn from: an installation, or a preview of one. */
type AppIconSource = Pick<AppInstallation, 'manifest' | 'icon_svg'>;

interface AppIconProps {
  app: AppIconSource;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}

const StoredSvg: React.FC<{ svg: string; className: string }> = ({ svg, className }) => (
  <img alt="" className={className} src={`data:image/svg+xml,${encodeURIComponent(svg)}`} />
);

/**
 * An app's icon, drawn by Ghost on the app's accent color: an icon Admin ships, by name, or
 * the copy of the app's SVG Ghost stored. Admin never requests the SVG from the app. A name
 * Admin doesn't know, or an SVG with no stored copy, falls back to a default.
 */
export const AppIcon: React.FC<AppIconProps> = ({ app, size = 'md', className }) => {
  const { icon, accent_color: color } = app.manifest;
  const glyph = GLYPH_SIZES[size];

  let content: React.ReactNode;
  if (app.icon_svg) {
    content = <StoredSvg className={glyph} svg={app.icon_svg} />;
  } else {
    const Glyph = ('name' in icon ? namedIcon(icon.name) : undefined) ?? LucideIcon.AppWindow;
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

/**
 * An app's icon at the size of a sidebar item's. A named icon is drawn bare, so the
 * sidebar colours it like its own. The app's own SVG is drawn for its accent colour, so it
 * keeps a small tile of it.
 */
export const AppNavIcon: React.FC<{ app: AppIconSource }> = ({ app }) => {
  if (app.icon_svg) {
    return (
      <span
        aria-hidden="true"
        className="flex size-4 shrink-0 items-center justify-center rounded-[4px]"
        style={{ backgroundColor: app.manifest.accent_color }}
      >
        <StoredSvg className="size-3" svg={app.icon_svg} />
      </span>
    );
  }
  const { icon } = app.manifest;
  const Glyph = ('name' in icon ? namedIcon(icon.name) : undefined) ?? LucideIcon.AppWindow;
  return <Glyph aria-hidden="true" />;
};

/** The band an app's icon sits into at the top of the install screen, in its accent color. */
export const AppBanner: React.FC<{ className?: string; color: string }> = ({
  className,
  color,
}) => <div aria-hidden="true" className={className} style={{ backgroundColor: color }} />;
