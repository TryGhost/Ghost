import React from 'react';
import { Badge } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { isVerifiedDeveloper } from '@/apps/lib/developer';
import { servedFrom } from '@/apps/lib/served-from';

/** Says Ghost hasn't checked who made the app, next to the developer's name. */
export const UnverifiedDeveloperBadge: React.FC<{ manifest: AppManifest }> = ({ manifest }) =>
  isVerifiedDeveloper(manifest) ? null : (
    <Badge data-testid="app-unverified-developer-badge" variant="outline" asChild>
      <span>Unverified developer</span>
    </Badge>
  );

/**
 * Who made an app, linked to the developer's site unless `linked` is false, such as inside a row
 * that is a link. `emphasised` sets the name in the foreground colour, against secondary text.
 */
export const AppAuthor: React.FC<{
  manifest: AppManifest;
  linked?: boolean;
  emphasised?: boolean;
}> = ({ manifest, linked = true, emphasised = false }) => {
  const className = cn(emphasised && 'text-foreground');
  return linked ? (
    <a
      className={cn('hover:underline', className)}
      href={manifest.author.url}
      rel="noopener noreferrer"
      target="_blank"
    >
      {manifest.author.name}
    </a>
  ) : (
    <span className={className}>{manifest.author.name}</span>
  );
};

/**
 * Where an app is served from, which Ghost checked, then who made it, as one run of text so the
 * separator wraps with the words around it. `emphasised` sets the host, in medium weight, and the
 * developer's name in the foreground colour, against the secondary text around them.
 */
export const AppProvenance: React.FC<{
  manifest: AppManifest;
  linked?: boolean;
  emphasised?: boolean;
  className?: string;
}> = ({ manifest, linked, emphasised = false, className }) => (
  <span className={className}>
    Served from{' '}
    <span className={cn('break-all', emphasised && 'font-medium text-foreground')}>
      {servedFrom(manifest)}
    </span>{' '}
    · By <AppAuthor emphasised={emphasised} linked={linked} manifest={manifest} />
  </span>
);
