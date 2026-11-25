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

/** The icon Admin draws when the app has no stored copy: its named icon or a default. */
function glyphFor(icon: AppInstallation['manifest']['icon']): LucideIcon.LucideIcon {
  return ('name' in icon ? namedIcon(icon.name) : undefined) ?? LucideIcon.AppWindow;
}

const TILE_SIZES = { md: 'size-10', lg: 'size-12', xl: 'size-16 rounded-xl' };
const GLYPH_SIZES = { md: 'size-[18px]', lg: 'size-6', xl: 'size-7' };

/** An installation or a preview. */
export type AppIconSource = Pick<AppInstallation, 'manifest' | 'icon_data_url'>;

interface AppIconProps {
  app: AppIconSource;
  size?: keyof typeof TILE_SIZES;
  className?: string;
}

/**
 * The copy of the app's icon Ghost stored, as a data URL, so drawing it never requests
 * anything from the app. It isn't sanitized, so it's only ever drawn as an image, which
 * can't run scripts or load anything.
 *
 * Ghost doesn't check the bytes, so a copy can fail to load. Then this gives null and the
 * caller draws the default icon instead.
 */
function useStoredIcon(app: AppIconSource): [string | null, () => void] {
  const [failed, setFailed] = React.useState<string | null>(null);
  const stored = app.icon_data_url?.startsWith('data:image/') ? app.icon_data_url : null;
  return [stored === failed ? null : stored, () => setFailed(stored)];
}

/**
 * An app's icon in `currentColor`, like the icons Admin ships: its named icon, or the copy
 * of its own icon Ghost stored, or a default icon. A stored copy masks `currentColor` with
 * its opaque pixels; inside the mask it's still an image, which can't run scripts.
 */
const AppGlyph: React.FC<{ app: AppIconSource; className: string; strokeWidth?: number }> = ({
  app,
  className,
  strokeWidth,
}) => {
  const [stored, onError] = useStoredIcon(app);
  const maskId = React.useId();
  if (!stored) {
    const Glyph = glyphFor(app.manifest.icon);
    return (
      <Glyph aria-hidden="true" className={cn('shrink-0', className)} strokeWidth={strokeWidth} />
    );
  }
  return (
    <svg aria-hidden="true" className={cn('shrink-0', className)} viewBox="0 0 24 24">
      <mask id={maskId} style={{ maskType: 'alpha' }}>
        {/* React listens for `error` on an SVG `<image>` as it does on an `<img>`. */}
        {/* eslint-disable-next-line react/no-unknown-property */}
        <image height="24" href={stored} width="24" onError={onError} />
      </mask>
      <rect fill="currentColor" height="24" mask={`url(#${maskId})`} width="24" />
    </svg>
  );
};

/** An app's icon in white on a tile of its accent colour. */
export const AppIcon: React.FC<AppIconProps> = ({ app, size = 'md', className }) => (
  <span
    aria-hidden="true"
    className={cn(
      'flex shrink-0 items-center justify-center rounded-md text-white',
      TILE_SIZES[size],
      className,
    )}
    style={{ backgroundColor: app.manifest.accent_color }}
  >
    <AppGlyph app={app} className={GLYPH_SIZES[size]} strokeWidth={1.5} />
  </span>
);

/** An app's icon at sidebar size, drawn bare so the sidebar colours it like its own icons. */
export const AppNavIcon: React.FC<{ app: AppIconSource }> = ({ app }) => (
  <AppGlyph app={app} className="size-4" />
);

/** The band an app's icon sits into at the top of the install screen, in its accent color. */
export const AppBanner: React.FC<{ className?: string; color: string }> = ({
  className,
  color,
}) => <div aria-hidden="true" className={className} style={{ backgroundColor: color }} />;
