import React from 'react';
import { FacebookLogo, GoogleLogo, XLogo } from '@tryghost/shade/components';
import { LucideIcon, formatNumber } from '@tryghost/shade/utils';
import { truncateText } from './tag-detail-edit';

/**
 * Static mock previews for the metadata sections, porting the Ember tag form's
 * search/X/Facebook cards including their placeholder copy and decoration.
 */

const SEO_DESCRIPTION_FALLBACK =
  'Search engines will automatically show a custom preview of content related to the search term here if no custom meta description is set.';

export const SeoPreview: React.FC<{ url: string; title: string; description: string }> = ({
  url,
  title,
  description,
}) => (
  <div
    className="rounded-md border border-border bg-surface-elevated p-4"
    data-testid="seo-preview"
  >
    <div className="mb-6 flex items-center gap-4">
      <GoogleLogo className="h-6" />
      <div className="flex h-9 flex-1 items-center justify-end rounded-full border border-border px-3">
        <LucideIcon.Search className="size-4 text-muted-foreground" />
      </div>
    </div>
    <div className="flex flex-col gap-0.5">
      <span className="truncate text-sm text-muted-foreground">{url}</span>
      <span className="text-lg" data-testid="seo-preview-title">
        {title}
      </span>
      <span className="text-sm text-muted-foreground" data-testid="seo-preview-description">
        {description ? truncateText(description, 149) : SEO_DESCRIPTION_FALLBACK}
      </span>
    </div>
  </div>
);

const FakePostLines: React.FC = () => (
  <div className="mt-2 mb-3 flex flex-col gap-2">
    <span className="h-2 w-full rounded-sm bg-muted" />
    <span className="h-2 w-3/5 rounded-sm bg-muted" />
  </div>
);

export const XCardPreview: React.FC<{
  siteHeader: string;
  domain: string;
  image: string;
  title: string;
  description: string;
}> = ({ siteHeader, domain, image, title, description }) => (
  <div
    className="rounded-md border border-border bg-surface-elevated p-4"
    data-testid="x-card-preview"
  >
    <div className="flex gap-3">
      <XLogo className="mt-1 size-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <span className="text-sm font-semibold">{siteHeader}</span>
        <span className="ml-1 text-sm text-muted-foreground">{formatNumber(12)} hrs</span>
        <FakePostLines />
        <div className="overflow-hidden rounded-md border border-border">
          {image && (
            <div
              className="h-32 bg-muted bg-cover bg-center"
              style={{ backgroundImage: `url(${image})` }}
            />
          )}
          <div className="flex flex-col gap-0.5 p-3">
            <span className="truncate text-sm font-semibold" data-testid="x-card-preview-title">
              {title}
            </span>
            <span
              className="text-sm text-muted-foreground"
              data-testid="x-card-preview-description"
            >
              {truncateText(description)}
            </span>
            <span className="flex items-center gap-1 text-sm text-muted-foreground">
              <LucideIcon.Link className="size-3.5" />
              {domain}
            </span>
          </div>
        </div>
        <div className="mt-2 flex items-center gap-6 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <LucideIcon.MessageCircle className="size-3.5" />
            {formatNumber(2)}
          </span>
          <span className="flex items-center gap-1">
            <LucideIcon.Repeat2 className="size-3.5" />
            {formatNumber(11)}
          </span>
          <span className="flex items-center gap-1">
            <LucideIcon.Heart className="size-3.5" />
            {formatNumber(32)}
          </span>
          <span className="flex items-center gap-1">
            <LucideIcon.Share className="size-3.5" />
          </span>
        </div>
      </div>
    </div>
  </div>
);

export const FacebookCardPreview: React.FC<{
  siteHeader: string;
  domain: string;
  image: string;
  title: string;
  description: string;
}> = ({ siteHeader, domain, image, title, description }) => (
  <div
    className="rounded-md border border-border bg-surface-elevated p-4"
    data-testid="facebook-card-preview"
  >
    <div className="flex items-center gap-3">
      <FacebookLogo className="size-10 shrink-0" />
      <div className="flex flex-col">
        <span className="text-sm font-semibold">{siteHeader}</span>
        <span className="text-sm text-muted-foreground">{formatNumber(12)} hrs</span>
      </div>
    </div>
    <FakePostLines />
    <div className="overflow-hidden rounded-md border border-border">
      {image && (
        <div
          className="h-32 bg-muted bg-cover bg-center"
          style={{ backgroundImage: `url(${image})` }}
        />
      )}
      <div className="flex flex-col gap-0.5 p-3">
        <span className="text-xs text-muted-foreground uppercase">{domain}</span>
        <span className="truncate text-sm font-semibold" data-testid="facebook-card-preview-title">
          {truncateText(title)}
        </span>
        <span
          className="text-sm text-muted-foreground"
          data-testid="facebook-card-preview-description"
        >
          {truncateText(description)}
        </span>
      </div>
    </div>
    <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
      <span className="flex items-center gap-1">
        <LucideIcon.ThumbsUp className="size-3.5" />
        {formatNumber(182)}
      </span>
      <span>{formatNumber(7)} comments</span>
      <span>{formatNumber(2)} shares</span>
    </div>
  </div>
);
