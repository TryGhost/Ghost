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

/** An installation or a preview. */
type AppIconSource = Pick<AppInstallation, 'manifest' | 'icon_svg'>;

interface AppIconProps {
  app: AppIconSource;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}

// Drawn as an image, which can't run scripts, load anything or pick up Admin's styles. A
// second layer on top of the server's sanitizing.
const StoredSvg: React.FC<{ svg: string; className: string }> = ({ svg, className }) => (
  <img alt="" className={className} src={`data:image/svg+xml,${encodeURIComponent(svg)}`} />
);

/**
 * An app's icon on its accent colour: a named icon, or the copy of its SVG that Ghost
 * stored, so Admin never requests it from the app. Falls back to a default icon.
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
 * An app's icon at sidebar size. A named icon is drawn bare so the sidebar colours it. An
 * app's SVG is made for its accent colour, so it keeps a small tile of it.
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
