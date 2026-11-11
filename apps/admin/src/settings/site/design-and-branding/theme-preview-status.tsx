import React from 'react';
import { Button, LoadingIndicator } from '@tryghost/shade/components';
import { type Theme } from '@tryghost/admin-x-framework/api/themes';
import { cn } from '@tryghost/shade/utils';
import { getThemeDisplayName } from './theme-names';

/**
 * Over the preview while a previewed theme gets ready (its settings and token
 * load), or when it can't be shown, with a way to try again. Announced to
 * screen readers.
 */
const ThemePreviewStatus: React.FC<{
  theme?: Theme;
  unavailable: boolean;
  onRetry: () => void;
  className?: string;
}> = ({ theme, unavailable, onRetry, className }) => (
  <div
    aria-live="polite"
    className={cn(
      'absolute inset-0 z-20 flex items-center justify-center bg-background/70',
      className,
    )}
    data-testid="theme-preview-status"
    role="status"
  >
    {unavailable ? (
      <div className="flex max-w-xs flex-col items-center gap-3 text-center">
        <p className="text-sm text-text-secondary">
          {theme ? getThemeDisplayName(theme) : 'This theme'} can&apos;t be previewed right now.
        </p>
        <Button size="sm" type="button" variant="outline" onClick={onRetry}>
          Try again
        </Button>
      </div>
    ) : (
      <>
        <LoadingIndicator size="md" />
        <span className="sr-only">Loading the preview</span>
      </>
    )}
  </div>
);

export default ThemePreviewStatus;
