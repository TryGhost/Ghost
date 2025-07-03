import {renderHook} from '@testing-library/react';
import React, {ReactNode} from 'react';
import useHandleError from '../../../src/hooks/useHandleError';
import {FrameworkProvider} from '../../../src/providers/FrameworkProvider';
import {APIError, ValidationError} from '../../../src/utils/errors';

// Mock external dependencies
vi.mock('@sentry/react', () => ({
    withScope: vi.fn((callback: any) => callback({
        setTag: vi.fn(),
        setContext: vi.fn()
    })),
    captureException: vi.fn(),
    ErrorBoundary: ({children}: {children: any}) => children
}));

vi.mock('@tryghost/admin-x-design-system', () => ({
    showToast: vi.fn()
}));

vi.mock('react-hot-toast', () => ({
    default: {
        remove: vi.fn()
    }
}));

const mockShowToast = vi.fn();
const mockToastRemove = vi.fn();

import * as Sentry from '@sentry/react';
import {showToast} from '@tryghost/admin-x-design-system';
import toast from 'react-hot-toast';

const createWrapper = (sentryDSN?: string): React.FC<{children: ReactNode}> => {
    const TestWrapper: React.FC<{children: ReactNode}> = ({children}) => (
        <FrameworkProvider
            externalNavigate={() => {}}
            ghostVersion='5.x'
            sentryDSN={sentryDSN || ''}
            unsplashConfig={{
                Authorization: '',
                'Accept-Version': '',
                'Content-Type': '',
                'App-Pragma': '',
                'X-Unsplash-Cache': true
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

describe('useHandleError', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup mocks
        (Sentry.withScope as any).mockImplementation((callback: any) => {
            const scope = {
                setTag: vi.fn(),
                setContext: vi.fn()
            };
            callback(scope);
        });
        
        (showToast as any).mockImplementation(mockShowToast);
        (toast.remove as any).mockImplementation(mockToastRemove);
        
        // Reset console.error mock
        vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
        vi.clearAllMocks();
        vi.restoreAllMocks();
    });

    it('returns a function', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        expect(typeof result.current).toBe('function');
    });

    it('logs error to console', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        const error = new Error('Test error');

        result.current(error);

        expect(console.error).toHaveBeenCalledWith(error); // eslint-disable-line no-console
    });

    it('sends error to Sentry when DSN is provided', () => {
        const wrapper = createWrapper('https://sentry.dsn');
        const {result} = renderHook(() => useHandleError(), {wrapper});
        const error = new Error('Test error');

        result.current(error);

        expect(Sentry.captureException).toHaveBeenCalledWith(error);
    });

    it('does not send to Sentry when no DSN is provided', () => {
        const wrapper = createWrapper('');
        const {result} = renderHook(() => useHandleError(), {wrapper});
        const error = new Error('Test error');

        result.current(error);

        expect(Sentry.captureException).not.toHaveBeenCalled();
    });

    it('adds API error context to Sentry', () => {
        const wrapper = createWrapper('https://sentry.dsn');
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        const mockResponse = new Response(null, {status: 404});
        Object.defineProperty(mockResponse, 'url', {
            value: 'https://api.example.com/test',
            writable: false
        });
        
        const error = new APIError(mockResponse);

        let scopeUsed: any;
        (Sentry.withScope as any).mockImplementation((callback: any) => {
            scopeUsed = {
                setTag: vi.fn(),
                setContext: vi.fn()
            };
            callback(scopeUsed);
        });

        result.current(error);

        expect(scopeUsed.setTag).toHaveBeenCalledWith('api_url', 'https://api.example.com/test');
        expect(scopeUsed.setTag).toHaveBeenCalledWith('api_response_status', 404);
    });

    it('removes existing toasts', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        const error = new Error('Test error');

        result.current(error);

        expect(toast.remove).toHaveBeenCalled();
    });

    it('does not show toast when withToast is false', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        const error = new Error('Test error');

        result.current(error, {withToast: false});

        expect(showToast).not.toHaveBeenCalled();
    });

    it('does not show toast for 418 status (test indicator)', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        const mockResponse = new Response(null, {status: 418});
        const error = new APIError(mockResponse);

        result.current(error);

        expect(showToast).not.toHaveBeenCalled();
    });

    it('shows validation error message from context', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        const mockResponse = new Response();
        const errorData = {
            errors: [{
                message: 'Field is required',
                context: 'This field must be filled out',
                code: 'VALIDATION_ERROR',
                id: 'error-id',
                help: 'Help text',
                type: 'ValidationError',
                details: null,
                ghostErrorCode: null,
                property: 'fieldName'
            }]
        };
        
        const error = new ValidationError(mockResponse, errorData);

        result.current(error);

        expect(showToast).toHaveBeenCalledWith({
            message: 'This field must be filled out',
            type: 'error'
        });
    });

    it('shows validation error message when no context available', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        const mockResponse = new Response();
        const errorData = {
            errors: [{
                message: 'Field is required',
                context: null,
                code: 'VALIDATION_ERROR',
                id: 'error-id',
                help: 'Help text',
                type: 'ValidationError',
                details: null,
                ghostErrorCode: null,
                property: 'fieldName'
            }]
        };
        
        const error = new ValidationError(mockResponse, errorData);

        result.current(error);

        expect(showToast).toHaveBeenCalledWith({
            message: 'Field is required',
            type: 'error'
        });
    });

    it('shows API error message', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        const error = new APIError(undefined, undefined, 'API Error occurred');

        result.current(error);

        expect(showToast).toHaveBeenCalledWith({
            message: 'API Error occurred',
            type: 'error'
        });
    });

    it('shows generic error message for unknown errors', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});
        
        const error = new Error('Unknown error');

        result.current(error);

        expect(showToast).toHaveBeenCalledWith({
            message: 'Something went wrong, please try again.',
            type: 'error'
        });
    });

    it('handles string errors', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});

        result.current('String error');

        expect(console.error).toHaveBeenCalledWith('String error'); // eslint-disable-line no-console
        expect(showToast).toHaveBeenCalledWith({
            message: 'Something went wrong, please try again.',
            type: 'error'
        });
    });

    it('handles null/undefined errors', () => {
        const wrapper = createWrapper();
        const {result} = renderHook(() => useHandleError(), {wrapper});

        result.current(null);

        expect(console.error).toHaveBeenCalledWith(null); // eslint-disable-line no-console
        expect(showToast).toHaveBeenCalledWith({
            message: 'Something went wrong, please try again.',
            type: 'error'
        });
    });
});