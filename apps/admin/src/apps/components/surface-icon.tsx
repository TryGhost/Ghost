import React, { useId } from 'react';
import { Inline, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';

type SurfaceType = AppManifest['surfaces'][number]['type'];

const SURFACE_COPY: Record<SurfaceType, string> = {
  admin_page: 'A dedicated page in Admin',
};

/** Ghost's part of the drawing: the nav. */
const Grey: React.FC<React.SVGProps<SVGRectElement>> = ({ rx = 0.6, ...box }) => (
  <rect className="fill-muted-foreground/20" rx={rx} {...box} />
);

/** The app's part of the drawing, solid in its colour. */
const App: React.FC<React.SVGProps<SVGRectElement>> = ({ rx = 1.2, ...box }) => (
  <rect fill="currentColor" rx={rx} {...box} />
);

// Inside the frame, everything sits 3 in from the edge, with 2.5 between blocks.
const FRAMED: Record<SurfaceType, React.ReactNode> = {
  admin_page: (
    <>
      <Grey height={24} rx={0.9} width={8} x={3} y={3} />
      <App height={24} width={23.5} x={13.5} y={3} />
    </>
  ),
};

/**
 * A small drawing of where an app appears: a window with Ghost's parts in grey and the
 * app's part solid in its colour.
 */
export const SurfaceIcon: React.FC<{ type: SurfaceType; color: string; className?: string }> = ({
  type,
  color,
  className,
}) => {
  const clipId = useId();
  return (
    <svg
      aria-hidden="true"
      className={cn('h-6 w-8 shrink-0', className)}
      data-surface={type}
      fill="none"
      style={{ color }}
      viewBox="0 0 40 30"
    >
      <clipPath id={clipId}>
        <rect height={29} rx={1.8} width={39} x={0.5} y={0.5} />
      </clipPath>
      <rect
        className="fill-background stroke-border-strong"
        height={29}
        rx={1.8}
        strokeWidth={1}
        width={39}
        x={0.5}
        y={0.5}
      />
      <g clipPath={`url(#${clipId})`}>{FRAMED[type]}</g>
    </svg>
  );
};

/** Where an app appears in Ghost, one line per kind of surface, for the app review. */
export const SurfaceSummary: React.FC<{ manifest: AppManifest }> = ({ manifest }) => {
  // Several surfaces of one kind read as one line.
  const types = [...new Set(manifest.surfaces.map((surface) => surface.type))];
  return (
    <ul className="m-0 flex list-none flex-col gap-2 p-0" data-testid="app-surfaces">
      {types.map((type) => (
        <li key={type} data-testid="app-surface">
          <Inline gap="md">
            <SurfaceIcon color={manifest.accent_color} type={type} />
            <Text size="sm" weight="semibold">
              {SURFACE_COPY[type]}
            </Text>
          </Inline>
        </li>
      ))}
    </ul>
  );
};
