import React from 'react';
import { Badge, Link } from '@tryghost/shade/components';
import { Box, Inline, Stack, Text } from '@tryghost/shade/primitives';
import { cn } from '@tryghost/shade/utils';
import { supportLink } from '@/apps/lib/developer';
import { type AppIconSource, AppNavIcon } from './app-icon';

/*
 * The footer's text keeps the gutter of Shade's page templates, so it lines up with the app's own
 * content. Beside the nav, Admin's page area starts 8px further from the nav than it ends from the
 * window's right edge, with either layout, so the footer stops 8px short of that edge to leave the
 * same space on both sides. Admin's layout drops that margin where it pads the page evenly, as beside
 * Admin 7's unpinned nav. Without the nav, it runs edge to edge.
 *
 * The gutter follows the width of the footer's own container, not the page's: a container on the
 * page would hold any fixed-position element inside it to the page area.
 */
const FOOTER_CLASS_NAME =
  'border-t border-border-default bg-background p-4 sidebar:mr-2 @min-[1024px]/app-footer:px-6';

/*
 * A development build, one the developer is running on their own machine, gets a striped band so
 * it's never mistaken for the app the site runs. The stripes sit behind the footer's content and
 * fade out over 24px at each end; the hairline above them runs the full width.
 */
const DEVELOPMENT_CLASS_NAME = cn(
  'relative isolate before:absolute before:inset-0 before:-z-10',
  'before:bg-[repeating-linear-gradient(-45deg,var(--background)_0_10px,color-mix(in_oklab,var(--border-default)_35%,var(--background))_10px_20px)]',
  'before:[mask-image:linear-gradient(to_right,transparent,black_24px,black_calc(100%-24px),transparent)]',
);

/**
 * Says which app the page comes from: its icon, its name and its developer, who links to wherever
 * the developer takes support. It wraps rather than cutting a name short.
 */
const AppFooter: React.FC<{ app: AppIconSource }> = ({ app }) => {
  const { name, author, development } = app.manifest;
  const support = supportLink(app.manifest);
  return (
    <footer
      className={cn(FOOTER_CLASS_NAME, development && DEVELOPMENT_CLASS_NAME)}
      data-app-footer=""
      data-development={development ? '' : undefined}
      data-testid="app-footer"
    >
      <Inline align="center" className="min-w-0" gap="sm" justify="between">
        <Inline align="center" className="min-w-0" gap="sm">
          <AppNavIcon app={app} />
          <Text as="p" className="min-w-0 break-words" size="sm" tone="secondary">
            {name} by{' '}
            <Link external={support.opensPage} href={support.href}>
              {author.name}
            </Link>
          </Text>
        </Inline>
        {development && (
          <Badge className="shrink-0" data-testid="app-development-badge" variant="default">
            Development
          </Badge>
        )}
      </Inline>
    </footer>
  );
};

/** An app page's content, filling the height above the footer. */
export const WithAppFooter: React.FC<{ app: AppIconSource; children: React.ReactNode }> = ({
  app,
  children,
}) => (
  <Stack className="size-full" gap="none">
    <Box className="min-h-0 flex-1 overflow-auto">{children}</Box>
    <div className="@container/app-footer shrink-0">
      <AppFooter app={app} />
    </div>
  </Stack>
);
