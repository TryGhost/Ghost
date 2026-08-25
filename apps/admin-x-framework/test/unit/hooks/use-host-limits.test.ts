import { renderHook } from '@testing-library/react';
import { useHostLimits } from '../../../src/hooks/use-host-limits';

vi.mock('../../../src/api/config', () => ({
  useBrowseConfig: vi.fn(),
}));

import { useBrowseConfig } from '../../../src/api/config';

const mockUseBrowseConfig = vi.mocked(useBrowseConfig);

const withConfig = (config: unknown) => {
  mockUseBrowseConfig.mockReturnValue({ data: config && { config } } as ReturnType<
    typeof useBrowseConfig
  >);
};

describe('useHostLimits', () => {
  afterEach(() => {
    vi.clearAllMocks();
  });

  it('returns the host limits from config', () => {
    withConfig({ hostSettings: { limits: { limitAnalytics: { disabled: true } } } });

    const { result } = renderHook(() => useHostLimits());

    expect(result.current?.limitAnalytics?.disabled).toBe(true);
  });

  it('returns undefined when the site has no host limits', () => {
    withConfig({ hostSettings: {} });

    const { result } = renderHook(() => useHostLimits());

    expect(result.current).toBeUndefined();
  });

  it('returns undefined before config has loaded', () => {
    withConfig(undefined);

    const { result } = renderHook(() => useHostLimits());

    expect(result.current).toBeUndefined();
  });
});
