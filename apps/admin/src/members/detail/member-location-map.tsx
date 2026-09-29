// Country and US state backdrop for member detail pages.
// Countries and US states share one Natural Earth projection; no member data leaves this app.
import React, { useId, useLayoutEffect, useRef, useState } from 'react';
import atlas from './map-data/world-states.json';
import { Box } from '@tryghost/shade/primitives';
import { cn, LucideIcon } from '@tryghost/shade/utils';
import { parseMemberGeolocation } from './member-detail-format';
import { MemberMapContext } from './member-map-context';

type MapLocation = (typeof atlas.countries)[number];

function LocationMap({ country, region }: { country: MapLocation; region?: string }) {
  const isUS = country.id === 'us';
  const normalizedRegion =
    typeof region === 'string' ? region.trim().toLowerCase().replace(/^us-/, '') : '';
  const state = isUS
    ? atlas.states.find(
        (location) =>
          location.id === `us-${normalizedRegion}` ||
          location.name.toLowerCase() === normalizedRegion ||
          (location.id === 'us-dc' &&
            ['washington, dc', 'washington dc', 'washington, d.c.', 'd.c.'].includes(
              normalizedRegion,
            )),
      )
    : undefined;
  const selected = state ?? country;
  const showPin = !isUS || !!state;
  const pinLabel = state
    ? `${state.name}, US — approximate state location`
    : `${country.name} — approximate country location`;
  const geometryId = useId();
  const svgRef = useRef<SVGSVGElement>(null);
  const [viewBox, setViewBox] = useState('0 0 360 360');
  const [viewX, , viewWidth] = viewBox.split(' ').map(Number);

  useLayoutEffect(() => {
    const svg = svgRef.current;
    if (!svg) {
      return;
    }
    const fit = () => {
      const [, , boundsWidth, boundsHeight] = selected.bounds;
      const aspect = Math.max(svg.clientWidth, 1) / Math.max(svg.clientHeight, 1);
      const [centerX, centerY] = selected.anchor;
      const padding = isUS && !state ? 1.2 : 3;
      const height = Math.max(boundsHeight * padding, (boundsWidth * padding) / aspect, 18) * 1.15;
      const width = height * aspect;
      setViewBox(`${centerX - width / 2} ${centerY - height / 2} ${width} ${height}`);
    };
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(svg);
    return () => observer.disconnect();
  }, [selected, isUS, state]);

  return (
    <>
      <svg
        ref={svgRef}
        aria-hidden="true"
        className="size-full bg-muted dark:bg-muted/45"
        data-map-kind="world"
        data-testid="member-location-map"
        preserveAspectRatio="xMidYMid slice"
        viewBox={viewBox}
      >
        <g id={geometryId}>
          {atlas.countries.map((location) => (
            <path
              key={location.id}
              className="fill-background stroke-border-default"
              d={location.path}
              data-location={location.id}
              strokeWidth={0.7}
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {isUS &&
            atlas.states.map((location) => (
              <path
                key={location.id}
                className="fill-none stroke-border-default"
                d={location.path}
                data-location={location.id}
                strokeWidth={0.7}
                vectorEffect="non-scaling-stroke"
              />
            ))}
        </g>
        {/* Reuse geometry only when the viewport crosses the date line. */}
        {viewX < 0 && <use href={`#${geometryId}`} transform="translate(-360 0)" />}
        {viewX + viewWidth > 360 && <use href={`#${geometryId}`} transform="translate(360 0)" />}
      </svg>
      {showPin && (
        <Box
          aria-label={pinLabel}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-full"
          role="img"
        >
          <LucideIcon.MapPin
            className="size-8 fill-foreground text-background drop-shadow-sm"
            strokeWidth={1.5}
          />
        </Box>
      )}
    </>
  );
}

export default function MemberLocationMap({
  geolocation,
  children,
}: React.PropsWithChildren<{ geolocation?: string | null }>) {
  const geo = parseMemberGeolocation(geolocation);
  const countryCode =
    typeof geo?.country_code === 'string' ? geo.country_code.trim().toLowerCase() : '';
  const country = atlas.countries.find((item) => item.id === countryCode);

  return (
    <Box
      className={cn(
        'relative isolate overflow-hidden rounded-xl',
        country
          ? '[&_[data-page-header=main]]:items-end'
          : '[&_[data-page-header=main]]:items-start',
        country &&
          '-mt-5 -mr-[calc((100cqw-100%)/2-8px)] -ml-[calc((100cqw-100%)/2-var(--member-map-left-inset,8px))] rounded-t-xl rounded-b-none pt-40 pr-[calc((100cqw-100%)/2-8px)] pb-5 pl-[calc((100cqw-100%)/2-var(--member-map-left-inset,8px))]',
        country && '[&_[data-page-header=primary]]:ms-1',
        country &&
          'max-sm:[&_[data-page-header=actions]]:absolute max-sm:[&_[data-page-header=actions]]:top-4 max-sm:[&_[data-page-header=actions]]:right-4',
        country &&
          'max-sm:pt-49 max-sm:[&_[aria-label=breadcrumb]]:absolute max-sm:[&_[aria-label=breadcrumb]]:top-4 max-sm:[&_[aria-label=breadcrumb]]:right-40 max-sm:[&_[aria-label=breadcrumb]]:left-4 max-sm:[&_[aria-label=breadcrumb]>ol]:flex-nowrap max-sm:[&_[aria-label=breadcrumb]>ol>li:last-child]:min-w-0',
      )}
      data-member-map-location={country ? 'known' : 'unknown'}
      data-testid="member-location-map-header"
    >
      {country && (
        <Box className="pointer-events-none absolute inset-0 -z-10 overflow-hidden [mask-image:linear-gradient(to_bottom,black_70%,transparent)]">
          <LocationMap country={country} region={geo?.region} />
        </Box>
      )}
      <MemberMapContext.Provider value={!!country}>{children}</MemberMapContext.Provider>
    </Box>
  );
}
