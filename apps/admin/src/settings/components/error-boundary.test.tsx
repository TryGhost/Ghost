import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import * as Sentry from '@sentry/react';
import ErrorBoundary from './error-boundary';

vi.mock('@sentry/react', () => ({
  captureException: vi.fn(),
  withScope: vi.fn((callback: (scope: { setTag: () => void }) => void) =>
    callback({ setTag: vi.fn() }),
  ),
}));

function Exploding(): never {
  throw new Error('render exploded');
}

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.mocked(Sentry.captureException).mockClear();
});

describe('ErrorBoundary', () => {
  it('captures a render error to Sentry and shows the banner', () => {
    render(
      <ErrorBoundary name="the widget">
        <Exploding />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('An error occurred loading the widget');
    expect(Sentry.captureException).toHaveBeenCalledWith(new Error('render exploded'));
  });

  it('hands the error to onError instead of Sentry when one is given', () => {
    const onError = vi.fn();

    render(
      <ErrorBoundary name="the widget" onError={onError}>
        <Exploding />
      </ErrorBoundary>,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(onError).toHaveBeenCalledTimes(1);
    const [error, info] = onError.mock.calls[0] as [unknown, { componentStack?: string }];
    expect(error).toEqual(new Error('render exploded'));
    expect(typeof info.componentStack).toBe('string');
    expect(Sentry.captureException).not.toHaveBeenCalled();
  });
});
