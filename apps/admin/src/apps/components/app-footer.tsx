import React from 'react';
import { Link } from '@tryghost/shade/components';
import { Inline, Stack, Text } from '@tryghost/shade/primitives';
import { supportUrl } from '@/apps/lib/developer';
import { type AppIconSource, AppNavIcon } from './app-icon';

/**
 * Admin's line under an app's page, saying whose app it is and where to get help. It wraps rather
 * than cutting a name short, and its gutter lines up with Shade's page templates inside the frame.
 */
const AppFooter: React.FC<{ app: AppIconSource }> = ({ app }) => {
  const { name, author } = app.manifest;
  return (
    <Inline
      align="start"
      as="footer"
      className="mx-4 min-h-10 shrink-0 border-t border-border-default bg-background py-2.5 text-text-secondary @min-[1024px]/app-page:mx-6"
      data-testid="app-footer"
      gap="sm"
    >
      <span className="mt-0.5 flex shrink-0">
        <AppNavIcon app={app} />
      </span>
      <Text as="p" className="min-w-0 break-words" size="sm" tone="secondary">
        {name} by {author.name}.{' '}
        <Link href={supportUrl(app.manifest)} external>
          Contact support
        </Link>
        .
      </Text>
    </Inline>
  );
};

/** An app page's content, filling the height above the footer. */
export const WithAppFooter: React.FC<{ app: AppIconSource; children: React.ReactNode }> = ({
  app,
  children,
}) => (
  <Stack className="size-full" gap="none">
    <div className="min-h-0 flex-1">{children}</div>
    <AppFooter app={app} />
  </Stack>
);
