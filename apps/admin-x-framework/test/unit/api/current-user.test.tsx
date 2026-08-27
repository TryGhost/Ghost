import { renderHook, waitFor } from '@testing-library/react';
import { createTestQueryClient, TestWrapper } from '../../../src/test/test-utils';
import { useCurrentUser } from '../../../src/api/current-user';
import { withMockFetch } from '../../utils/mock-fetch';

const { mockHandleError } = vi.hoisted(() => ({
  mockHandleError: vi.fn(),
}));

vi.mock('../../../src/hooks/use-handle-error', () => ({
  default: () => mockHandleError,
}));

describe('useCurrentUser', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('reports query errors through the default error handler', async () => {
    await withMockFetch(
      {
        json: { errors: [{ message: 'Current user failed' }] },
        ok: false,
        status: 500,
      },
      async () => {
        const queryClient = createTestQueryClient();
        const wrapper = ({ children }: { children: React.ReactNode }) => (
          <TestWrapper queryClient={queryClient}>{children}</TestWrapper>
        );
        const { result } = renderHook(() => useCurrentUser(), { wrapper });

        await waitFor(() => expect(result.current.isError).toBe(true));

        expect(mockHandleError).toHaveBeenCalledOnce();
        expect(mockHandleError).toHaveBeenCalledWith(result.current.error);
      },
    );
  });
});
