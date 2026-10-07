import { renderHook } from '@testing-library/react';
import React, { ReactNode } from 'react';
import useHandleError from '../../../src/hooks/use-handle-error';
import { FrameworkProvider } from '../../../src/providers/framework-provider';
import {
  APIError,
  SessionExpiredError,
  UnauthorizedError,
  ValidationError,
} from '../../../src/utils/errors';

const { sentryScope } = vi.hoisted(() => ({
  sentryScope: { setTag: vi.fn(), setContext: vi.fn() },
}));

// Mock external dependencies
vi.mock('@sentry/react', () => ({
  getClient: vi.fn(),
  withScope: vi.fn((callback: (scope: typeof sentryScope) => void) => callback(sentryScope)),
  captureException: vi.fn(),
  ErrorBoundary: ({ children }: { children: any }) => children,
}));

const { mockToastDismiss, mockToastError } = vi.hoisted(() => ({
  mockToastDismiss: vi.fn(),
  mockToastError: vi.fn(),
}));

vi.mock('sonner', () => ({
  toast: {
    dismiss: mockToastDismiss,
    error: mockToastError,
  },
}));

import * as Sentry from '@sentry/react';
import { toast } from 'sonner';

const createWrapper = (): React.FC<{ children: ReactNode }> => {
  const TestWrapper: React.FC<{ children: ReactNode }> = ({ children }) => (
    <FrameworkProvider
      externalNavigate={() => {}}
      ghostVersion="5.x"
      unsplashConfig={{
        Authorization: '',
        'Accept-Version': '',
        'Content-Type': '',
        'App-Pragma': '',
        'X-Unsplash-Cache': true,
      }}
      onDelete={() => {}}
      onInvalidate={() => {}}
      onUpdate={() => {}}
    >
      {children}
    </FrameworkProvider>
  );
  TestWrapper.displayName = 'TestWrapper';
  return TestWrapper;
};

const enableSentry = () =>
  vi.mocked(Sentry.getClient).mockReturnValue({} as ReturnType<typeof Sentry.getClient>);

const reportedTags = () => Object.fromEntries(sentryScope.setTag.mock.calls);

describe('useHandleError', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(Sentry.getClient).mockReturnValue(undefined);

    // Reset console.error mock
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.clearAllMocks();
    vi.restoreAllMocks();
  });

  it('returns a function', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    expect(typeof result.current).toBe('function');
  });

  it('logs error to console', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });
    const error = new Error('Test error');

    result.current(error);

    expect(console.error).toHaveBeenCalledWith(error); // eslint-disable-line no-console
  });

  it('reports nothing to Sentry without a Sentry client', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    result.current(new Error('Test error'));
    result.current(new APIError(undefined, undefined, 'API Error occurred'));

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('reports an unexpected error to Sentry as not shown to the user', () => {
    enableSentry();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });
    const error = new Error('Test error');

    result.current(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(reportedTags()).toEqual({ source: 'useHandleError', shown_to_user: false });
  });

  it('reports an API error to Sentry as shown to the user, with its request and message', () => {
    enableSentry();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response(null, { status: 422 });
    Object.defineProperty(mockResponse, 'url', {
      value: 'https://example.com/ghost/api/admin/tags/',
      writable: false,
    });
    const error = new ValidationError(mockResponse, {
      errors: [
        {
          message: 'Validation error, cannot save tag.',
          context: 'Tag name cannot be blank.',
          code: 'VALIDATION_ERROR',
          id: 'error-id',
          help: 'Help text',
          type: 'ValidationError',
          details: null,
          ghostErrorCode: null,
          property: 'name',
        },
      ],
    });

    result.current(error);

    expect(Sentry.captureException).toHaveBeenCalledWith(error);
    expect(reportedTags()).toEqual({
      source: 'useHandleError',
      shown_to_user: true,
      api_url: 'https://example.com/ghost/api/admin/tags/',
      api_response_status: 422,
    });
    expect(sentryScope.setContext).toHaveBeenCalledWith('ghost', {
      displayed_message: 'Tag name cannot be blank.',
    });
    expect(toast.error).toHaveBeenCalledWith('Tag name cannot be blank.');
  });

  it('removes existing toasts', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });
    const error = new Error('Test error');

    result.current(error);

    expect(toast.dismiss).toHaveBeenCalled();
  });

  it('does not show toast when withToast is false', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });
    const error = new Error('Test error');

    result.current(error, { withToast: false });

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('does not show toast for 418 status (test indicator)', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response(null, { status: 418 });
    const error = new APIError(mockResponse);

    result.current(error);

    expect(toast.error).not.toHaveBeenCalled();
  });

  it('still clears lingering toasts for 418 status', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response(null, { status: 418 });
    const error = new APIError(mockResponse);

    result.current(error);

    expect(toast.dismiss).toHaveBeenCalled();
  });

  it('never reports session expiry errors to Sentry', () => {
    enableSentry();
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response(null, { status: 401 });
    const error = new SessionExpiredError(mockResponse, '');

    result.current(error);
    result.current(error, { withToast: false });

    expect(Sentry.captureException).not.toHaveBeenCalled();
  });

  it('does not show toast for session expiry errors', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response(null, { status: 401 });
    const error = new SessionExpiredError(mockResponse, '');

    result.current(error);

    // Signed-out boots report every read as expired; the signin flow's own
    // toasts must survive those reports
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.dismiss).not.toHaveBeenCalled();
  });

  it('shows toast for unauthorized errors that do not trigger a redirect', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response(null, { status: 401 });
    const error = new UnauthorizedError(mockResponse, '');

    result.current(error);

    expect(toast.error).toHaveBeenCalledWith('You are not authorised to make this request.');
  });

  it('shows validation error message from context', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response();
    const errorData = {
      errors: [
        {
          message: 'Field is required',
          context: 'This field must be filled out',
          code: 'VALIDATION_ERROR',
          id: 'error-id',
          help: 'Help text',
          type: 'ValidationError',
          details: null,
          ghostErrorCode: null,
          property: 'fieldName',
        },
      ],
    };

    const error = new ValidationError(mockResponse, errorData);

    result.current(error);

    expect(toast.error).toHaveBeenCalledWith('This field must be filled out');
  });

  it('shows validation error message when no context available', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const mockResponse = new Response();
    const errorData = {
      errors: [
        {
          message: 'Field is required',
          context: null,
          code: 'VALIDATION_ERROR',
          id: 'error-id',
          help: 'Help text',
          type: 'ValidationError',
          details: null,
          ghostErrorCode: null,
          property: 'fieldName',
        },
      ],
    };

    const error = new ValidationError(mockResponse, errorData);

    result.current(error);

    expect(toast.error).toHaveBeenCalledWith('Field is required');
  });

  it('shows API error message', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const error = new APIError(undefined, undefined, 'API Error occurred');

    result.current(error);

    expect(toast.error).toHaveBeenCalledWith('API Error occurred');
  });

  it('shows generic error message for unknown errors', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    const error = new Error('Unknown error');

    result.current(error);

    expect(toast.error).toHaveBeenCalledWith('Something went wrong, please try again.');
  });

  it('handles string errors', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    result.current('String error');

    expect(console.error).toHaveBeenCalledWith('String error'); // eslint-disable-line no-console
    expect(toast.error).toHaveBeenCalledWith('Something went wrong, please try again.');
  });

  it('handles null/undefined errors', () => {
    const wrapper = createWrapper();
    const { result } = renderHook(() => useHandleError(), { wrapper });

    result.current(null);

    expect(console.error).toHaveBeenCalledWith(null); // eslint-disable-line no-console
    expect(toast.error).toHaveBeenCalledWith('Something went wrong, please try again.');
  });
});
