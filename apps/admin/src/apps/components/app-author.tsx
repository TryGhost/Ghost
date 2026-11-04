import React from 'react';
import { Badge } from '@tryghost/shade/components';
import { cn } from '@tryghost/shade/utils';
import type { AppManifest } from '@tryghost/admin-x-framework/api/app-installations';
import { isVerifiedDeveloper } from '@/apps/lib/developer';

/** Says Ghost hasn't checked who made the app, next to the developer's name. */
export const UnverifiedDeveloperBadge: React.FC<{ manifest: AppManifest }> = ({ manifest }) =>
  isVerifiedDeveloper(manifest) ? null : (
    <Badge data-testid="app-unverified-developer-badge" variant="outline" asChild>
      <span>Unverified developer</span>
    </Badge>
  );

/**
 * Who made an app, linked to the developer's site. `emphasised` sets the name in the foreground
 * colour, against secondary text.
 */
export const AppAuthor: React.FC<{ manifest: AppManifest; emphasised?: boolean }> = ({
  manifest,
  emphasised = false,
}) => (
  <a
    className={cn('hover:underline', emphasised && 'text-foreground')}
    href={manifest.author.url}
    rel="noopener noreferrer"
    target="_blank"
  >
    {manifest.author.name}
  </a>
);
