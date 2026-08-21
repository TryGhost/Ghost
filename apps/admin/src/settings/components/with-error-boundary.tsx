import ErrorBoundary from './error-boundary';
import { type ComponentType } from 'react';

export const withErrorBoundary = <Props extends Record<string, unknown>>(
  Component: ComponentType<Props>,
  name: string,
) => {
  return function WithErrorBoundary(props: Props) {
    return (
      <ErrorBoundary name={name}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
};
