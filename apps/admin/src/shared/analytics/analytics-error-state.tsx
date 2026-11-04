import React from 'react';
import { Button, EmptyIndicator } from '@tryghost/shade/components';
import { LucideIcon, cn } from '@tryghost/shade/utils';
import { TinybirdRequestError } from '@tryghost/admin-x-framework';

const getAnalyticsErrorDescription = (error: unknown): string => {
  if (error instanceof TinybirdRequestError) {
    switch (error.reason) {
      case 'rate_limited':
        return 'Analytics is getting a lot of requests right now. Wait a moment, then try again.';
      case 'timeout':
        return 'The analytics service took too long to respond. Try again in a moment.';
      case 'network':
        return 'Check your connection, then try again.';
      default:
        break;
    }
  }
  return 'Something went wrong while loading this data. Try again in a moment.';
};

interface AnalyticsErrorStateProps {
  error: unknown;
  onRetry?: () => void;
  className?: string;
  title?: string;
}

/**
 * Shown in place of a chart or table when its analytics request failed, so a
 * failure (429, timeout, 5xx) reads as an error with a way out rather than as
 * "no visitors".
 */
const AnalyticsErrorState: React.FC<AnalyticsErrorStateProps> = ({
  error,
  onRetry,
  className,
  title = 'Couldn’t load analytics',
}) => (
  <EmptyIndicator
    actions={
      onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          <LucideIcon.RotateCw />
          Retry
        </Button>
      )
    }
    className={cn('w-full py-14', className)}
    data-testid="analytics-error-state"
    description={getAnalyticsErrorDescription(error)}
    role="alert"
    title={title}
  >
    <LucideIcon.TriangleAlert strokeWidth={1.5} />
  </EmptyIndicator>
);

export default AnalyticsErrorState;
