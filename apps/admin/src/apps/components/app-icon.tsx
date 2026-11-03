import React from 'react';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import type { AppInstallation } from '@tryghost/admin-x-framework/api/app-installations';
import { useSolidIcon } from './use-solid-icon';

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
// An app's own icon is flattened to a white silhouette of its opaque pixels, so it
// matches the named icons whatever colours the app drew it in.
const MONOCHROME = 'brightness-0 invert';

/** An installation or a preview. */
type AppIconSource = Pick<AppInstallation, 'manifest' | 'icon_data_url'>;

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
 * An app's icon on its accent colour: a named icon, or the copy of its own icon that Ghost
 * stored, flattened to white, or in full colour filling the tile when it's solid. Falls back
 * to a default icon.
 */
export const AppIcon: React.FC<AppIconProps> = ({ app, size = 'md', className }) => {
  const { icon, accent_color: color } = app.manifest;
  const glyph = GLYPH_SIZES[size];

  const [stored, onError] = useStoredIcon(app);
  const solid = useSolidIcon(stored);
  let content: React.ReactNode;
  if (stored) {
    content = (
      <img
        alt=""
        className={cn(
          solid ? 'size-full object-cover' : [glyph, MONOCHROME],
          solid === undefined && 'invisible',
        )}
        src={stored}
        onError={onError}
      />
    );
  } else {
    const Glyph = glyphFor(icon);
    content = <Glyph className={glyph} strokeWidth={1.5} />;
  }

  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex shrink-0 items-center justify-center overflow-hidden rounded-md text-white',
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
 * An app's icon at sidebar size, drawn bare as an `svg` so the sidebar sizes and colours it
 * like its own icons. An app's own icon is used as a mask over `currentColor`, which keeps
 * only the shape of its opaque pixels. An `<image>` is still drawn as an image, so it can't
 * run scripts or load anything. A solid icon is drawn as it is, in full colour.
 */
export const AppNavIcon: React.FC<{ app: AppIconSource }> = ({ app }) => {
  const [stored, onError] = useStoredIcon(app);
  const solid = useSolidIcon(stored);
  // React 18 ids look like `:r1:`; the colons would end the `url(#…)` reference early.
  const maskId = `app-nav-icon-${React.useId().replace(/:/g, '')}`;
  if (stored && solid) {
    return (
      <img
        alt=""
        aria-hidden="true"
        className="size-4 shrink-0 rounded-[4px] object-cover"
        src={stored}
        onError={onError}
      />
    );
  }
  if (stored) {
    return (
      <svg
        aria-hidden="true"
        className={cn(solid === undefined && 'invisible')}
        viewBox="0 0 24 24"
      >
        <mask id={maskId} style={{ maskType: 'alpha' }}>
          {/* React listens for `error` on an SVG `<image>` as it does on an `<img>`. */}
          {/* eslint-disable-next-line react/no-unknown-property */}
          <image height="24" href={stored} width="24" onError={onError} />
        </mask>
        <rect fill="currentColor" height="24" mask={`url(#${maskId})`} width="24" />
      </svg>
    );
  }
  const Glyph = glyphFor(app.manifest.icon);
  return <Glyph aria-hidden="true" />;
};

/** The band an app's icon sits into at the top of the install screen, in its accent color. */
export const AppBanner: React.FC<{ className?: string; color: string }> = ({
  className,
  color,
}) => <div aria-hidden="true" className={className} style={{ backgroundColor: color }} />;
