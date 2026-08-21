import { StrictMode } from 'react';
import { render, waitFor } from '@testing-library/react';
import { Navigate } from '../../../src/providers/router-provider';
import { TestWrapper } from '../../../src/test/test-utils';

describe('Navigate', () => {
  it('performs cross-app navigation once after mounting in Strict Mode', async () => {
    const externalNavigate = vi.fn();

    render(
      <StrictMode>
        <TestWrapper frameworkProps={{ externalNavigate }}>
          <Navigate to="/posts" crossApp replace />
        </TestWrapper>
      </StrictMode>,
    );

    await waitFor(() => {
      expect(externalNavigate).toHaveBeenCalledWith({
        isExternal: true,
        replace: true,
        route: '/posts',
      });
    });
    expect(externalNavigate).toHaveBeenCalledTimes(1);
  });

  it('navigates again when the external destination changes', async () => {
    const externalNavigate = vi.fn();
    const { rerender } = render(
      <TestWrapper frameworkProps={{ externalNavigate }}>
        <Navigate to="/posts" crossApp replace />
      </TestWrapper>,
    );

    await waitFor(() => expect(externalNavigate).toHaveBeenCalledTimes(1));

    rerender(
      <TestWrapper frameworkProps={{ externalNavigate }}>
        <Navigate to="/site" crossApp replace />
      </TestWrapper>,
    );

    await waitFor(() => {
      expect(externalNavigate).toHaveBeenLastCalledWith({
        isExternal: true,
        replace: true,
        route: '/site',
      });
    });
    expect(externalNavigate).toHaveBeenCalledTimes(2);
  });
});
