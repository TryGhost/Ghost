// Throwaway spike: three country-map headers on /members/:id?variant=A|B|C.
// Uses the existing country outline dataset; no member data leaves this app.
import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import World from '@svg-maps/world';
import { useLocation, useNavigate } from '@tryghost/admin-x-framework';
import { Button } from '@tryghost/shade/components';
import { Box, Inline, Stack } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { parseMemberGeolocation } from './member-detail-format';

const world = (World as { default?: typeof World }).default ?? World;
const variants = ['A', 'B', 'C'] as const;
type Variant = (typeof variants)[number];
const names = { A: 'Map backdrop', B: 'Split header', C: 'Compact strip' };

function CountryMap({ countryId }: { countryId: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const countryRef = useRef<SVGPathElement>(null);
  const [viewBox, setViewBox] = useState(world.viewBox);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    const path = countryRef.current;
    if (!svg || !path) {
      return;
    }
    const fit = () => {
      const bounds = path.getBBox();
      const aspect = svg.clientWidth / Math.max(svg.clientHeight, 1);
      const height = Math.max(bounds.height * 1.8, (bounds.width * 1.8) / aspect, 12);
      const width = height * aspect;
      setViewBox(
        `${bounds.x + bounds.width / 2 - width / 2} ${bounds.y + bounds.height / 2 - height / 2} ${width} ${height}`,
      );
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [countryId]);

  return (
    <svg
      ref={svgRef}
      aria-hidden="true"
      className="size-full bg-muted"
      preserveAspectRatio="xMidYMid slice"
      viewBox={viewBox}
    >
      {world.locations.map((country) => (
        <path
          key={country.id}
          ref={country.id === countryId ? countryRef : undefined}
          className={
            country.id === countryId
              ? 'fill-chart-green/25 stroke-chart-green/60'
              : 'fill-background stroke-border-default'
          }
          d={country.path}
          strokeWidth={0.7}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}

export default function MemberMapPrototype({
  variant,
  geolocation,
  children,
}: React.PropsWithChildren<{ variant: Variant | null; geolocation?: string | null }>) {
  const location = useLocation();
  const navigate = useNavigate();
  const geo = parseMemberGeolocation(geolocation);
  const countryCode = typeof geo?.country_code === 'string' ? geo.country_code.toLowerCase() : '';
  const memberCountry = world.locations.find((item) => item.id === countryCode);
  // Explicit, URL-only fixture for reviewing the real page when this member has no location.
  const isSample =
    !memberCountry && new URLSearchParams(location.search).get('mapCountry') === 'GB';
  const country =
    memberCountry ?? (isSample ? world.locations.find((item) => item.id === 'gb') : undefined);
  const toggleSample = () => {
    const params = new URLSearchParams(location.search);
    if (isSample) {
      params.delete('mapCountry');
    } else {
      params.set('mapCountry', 'GB');
    }
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const changeVariant = React.useCallback(
    (direction: number) => {
      if (!variant) {
        return;
      }
      const params = new URLSearchParams(location.search);
      params.set(
        'variant',
        variants[(variants.indexOf(variant) + direction + variants.length) % variants.length],
      );
      navigate(`${location.pathname}?${params.toString()}`, { replace: true });
    },
    [location.pathname, location.search, navigate, variant],
  );

  useEffect(() => {
    if (!variant) {
      return;
    }
    const onKey = (event: KeyboardEvent) => {
      if (
        event.target instanceof Element &&
        event.target.closest(
          'input, textarea, select, button, a, [contenteditable], [role="menu"], [role="dialog"], [role="combobox"]',
        )
      ) {
        return;
      }
      if (
        !event.altKey &&
        !event.metaKey &&
        !event.ctrlKey &&
        (event.key === 'ArrowLeft' || event.key === 'ArrowRight')
      ) {
        event.preventDefault();
        changeVariant(event.key === 'ArrowRight' ? 1 : -1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [variant, changeVariant]);

  if (!variant) {
    return children;
  }

  return (
    <>
      <Box
        className={cn(
          'relative isolate overflow-hidden rounded-xl',
          country && variant === 'A' && '-mx-4 -mt-5 rounded-none px-4 pt-40 pb-5 lg:-mx-6 lg:px-6',
          country && variant === 'B' && 'min-h-44 border border-border-default p-5 sm:pr-[42%]',
          country && variant === 'C' && 'border border-border-default p-5',
        )}
        data-testid="member-map-prototype"
      >
        {country && (
          <Box
            className={cn(
              'pointer-events-none absolute inset-0 -z-10 overflow-hidden',
              variant === 'A' && '[mask-image:linear-gradient(to_bottom,black_35%,transparent)]',
              variant === 'B' &&
                'left-1/2 [mask-image:linear-gradient(to_right,transparent,black_35%)] sm:left-[58%]',
              variant === 'C' &&
                'left-1/2 [mask-image:linear-gradient(to_right,transparent,black)] opacity-65 sm:left-2/3',
            )}
          >
            <CountryMap countryId={country.id} />
          </Box>
        )}
        {children}
        <Inline className="mt-2 text-xs text-muted-foreground" gap="xs">
          <LucideIcon.MapPin className="size-3.5" />
          <span>
            {isSample
              ? 'Sample map · United Kingdom · Member location unknown'
              : country
                ? `${country.name} · Approximate country location`
                : 'Location unavailable'}
          </span>
        </Inline>
        {country && (
          <a
            className="absolute top-2 right-2 text-[10px] text-muted-foreground hover:underline"
            href="https://mapsvg.com/maps/world"
            rel="noreferrer"
            target="_blank"
            title="MapSVG via @svg-maps/world · CC BY 4.0 · colors and crop modified"
          >
            MapSVG · CC BY 4.0
          </a>
        )}
      </Box>
      <Inline
        aria-label="Map prototype controls"
        className="fixed bottom-5 left-1/2 z-50 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-full border border-border-default bg-surface-elevated-2 p-2 shadow-lg"
        gap="sm"
      >
        <Button
          aria-label="Previous map layout"
          size="icon"
          variant="ghost"
          onClick={() => changeVariant(-1)}
        >
          <LucideIcon.ChevronLeft />
        </Button>
        <Stack className="min-w-0 text-center" gap="none">
          <span className="text-sm font-medium">
            {variant} · {names[variant]}
          </span>
          <span className="truncate text-xs text-muted-foreground">
            {isSample
              ? 'Sample location · not member data'
              : `Spike · ${country?.name ?? 'Unknown location'} · country data only`}
          </span>
          {!memberCountry && (
            <Button className="mt-1 h-7" size="sm" variant="ghost" onClick={toggleSample}>
              {isSample ? 'Clear sample map' : 'Preview sample map'}
            </Button>
          )}
        </Stack>
        <Button
          aria-label="Next map layout"
          size="icon"
          variant="ghost"
          onClick={() => changeVariant(1)}
        >
          <LucideIcon.ChevronRight />
        </Button>
      </Inline>
    </>
  );
}
