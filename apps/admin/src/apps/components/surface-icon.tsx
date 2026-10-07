import React, { useId } from 'react';
import { Inline, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { appBrandColor } from '@/apps/lib/brand-color';
import type { AppSurface } from '@/apps/types';

/**
 * Every place an app could appear. Manifests only allow `page` today; the rest
 * are drawn ahead of time so the install dialog has an icon for each.
 */
export type SurfaceKind =
  | AppSurface
  | 'action'
  | 'widget'
  | 'adapter'
  | 'editor-card'
  | 'theme-block'
  | 'script';

const SURFACE_COPY: Record<SurfaceKind, string> = {
  page: 'A dedicated page in Admin',
  action: 'Actions in Admin menus',
  widget: 'A widget in Admin',
  adapter: 'Replaces a built-in Ghost feature',
  'editor-card': 'A card in the editor',
  'theme-block': 'A block your theme can show',
  script: 'Code on every page of your site',
};

interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
  rx?: number;
}

/** Ghost's part of the drawing: the nav, lines of content, other cards. */
const Grey: React.FC<Box> = ({ rx = 0.6, ...box }) => (
  <rect className="fill-muted-foreground/20" rx={rx} {...box} />
);

/** The app's part of the drawing, solid in its colour. */
const App: React.FC<Box> = ({ rx = 1.2, ...box }) => <rect fill="currentColor" rx={rx} {...box} />;

/** A white surface with a border: the window frame, or a menu. */
const Card: React.FC<Box> = ({ rx = 1.2, ...box }) => (
  <rect className="fill-background stroke-border-strong" rx={rx} strokeWidth={1} {...box} />
);

// Admin's nav, and a browser's bar for surfaces on the site itself.
const Nav = () => <Grey height={24} rx={0.9} width={8} x={3} y={3} />;
const BrowserBar = () => <Grey height={6} rx={0} width={38} x={1} y={1} />;

// Inside the frame, everything sits 3 in from the edge (x 3–37, y 3–27), with
// 2.5 between blocks to match that spacing. Radii are tight for the 32px size.
const FRAMED: Record<Exclude<SurfaceKind, 'action'>, React.ReactNode> = {
  page: (
    <>
      <Nav />
      <App height={24} width={23.5} x={13.5} y={3} />
    </>
  ),
  widget: (
    <>
      <Grey height={10.75} rx={0.9} width={14} x={3} y={3} />
      <Grey height={10.75} rx={0.9} width={14} x={3} y={16.25} />
      <App height={24} rx={0.9} width={17.5} x={19.5} y={3} />
    </>
  ),
  adapter: (
    <>
      <App height={7} rx={0.6} width={34} x={3} y={3} />
      <Grey height={2.5} width={22} x={3} y={12.5} />
      <Grey height={2.5} width={28} x={3} y={18.5} />
      <Grey height={2.5} width={17} x={3} y={24.5} />
    </>
  ),
  'editor-card': (
    <>
      <Grey height={2.5} width={18} x={3} y={3} />
      <Grey height={2.5} width={26} x={3} y={7.5} />
      <App height={9} width={34} x={3} y={12.5} />
      <Grey height={2.5} width={22} x={3} y={24.5} />
    </>
  ),
  'theme-block': (
    <>
      <BrowserBar />
      <Grey height={2.5} width={14} x={3} y={9.5} />
      <Grey height={2.5} width={10} x={3} y={14} />
      <Grey height={2.5} width={12} x={3} y={18.5} />
      <App height={17.5} width={17.5} x={19.5} y={9.5} />
    </>
  ),
  script: (
    <>
      <BrowserBar />
      <App height={5} rx={0.3} width={34} x={3} y={9.5} />
      <Grey height={2.5} width={20} x={3} y={17} />
      <Grey height={2.5} width={26} x={3} y={21.5} />
    </>
  ),
};

// A contextual action has no frame: the menu is the shape, with the line that
// opened it above, and the app's action between two of Ghost's.
const ACTION = (
  <>
    <Grey height={3} width={18} x={0.5} y={0.5} />
    <Card height={23.5} width={39} x={0.5} y={6} />
    <Grey height={2.5} width={20} x={3.5} y={9.5} />
    <App height={5} rx={0.6} width={33} x={3.5} y={15.5} />
    <Grey height={2.5} width={15} x={3.5} y={24} />
  </>
);

/**
 * A small drawing of where an app appears, after the app surfaces diagram: a
 * window with Ghost's parts in grey and the app's part solid in its colour.
 */
export const SurfaceIcon: React.FC<{
  surface: SurfaceKind;
  color?: string;
  className?: string;
}> = ({ surface, color, className }) => {
  const clipId = useId();

  return (
    <svg
      aria-hidden="true"
      className={cn('h-6 w-8 shrink-0', className)}
      data-surface={surface}
      fill="none"
      style={{ color: appBrandColor(color) }}
      viewBox="0 0 40 30"
    >
      {surface === 'action' ? (
        ACTION
      ) : (
        <>
          <clipPath id={clipId}>
            <rect height={29} rx={1.8} width={39} x={0.5} y={0.5} />
          </clipPath>
          <Card height={29} rx={1.8} width={39} x={0.5} y={0.5} />
          <g clipPath={`url(#${clipId})`}>{FRAMED[surface]}</g>
        </>
      )}
    </svg>
  );
};

/** The surface drawing with what it means, for the install dialog. */
export const SurfaceSummary: React.FC<{ surface: SurfaceKind; color?: string }> = ({
  surface,
  color,
}) => (
  <Inline data-testid="app-surface" gap="md">
    <SurfaceIcon color={color} surface={surface} />
    <Text size="sm" weight="semibold">
      {SURFACE_COPY[surface]}
    </Text>
  </Inline>
);
