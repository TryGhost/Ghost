import { renderHook } from '@testing-library/react';
import { useFeatureFlag } from '../../../src/hooks/use-feature-flag';

vi.mock('../../../src/api/config', () => ({
  useBrowseConfig: vi.fn(),
}));
vi.mock('../../../src/providers/feature-flag-overrides-context', () => ({
  useFeatureFlagOverrides: vi.fn(),
}));

import { useBrowseConfig } from '../../../src/api/config';
import { useFeatureFlagOverrides } from '../../../src/providers/feature-flag-overrides-context';

const mockUseBrowseConfig = useBrowseConfig as any;
const mockUseFeatureFlagOverrides = vi.mocked(useFeatureFlagOverrides);

const withLabs = (labs: Record<string, unknown>) => ({
  data: { config: { labs } },
});

describe('useFeatureFlag', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseFeatureFlagOverrides.mockReturnValue({ enabledFlags: [] });
  });

  it('returns true when the flag is explicitly true', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ myFlag: true }));

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(true);
  });

  it('does not refetch config when mounted', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ myFlag: true }));

    renderHook(() => useFeatureFlag('myFlag'));

    expect(mockUseBrowseConfig).toHaveBeenCalledWith({ refetchOnMount: false });
  });

  it('returns false when the flag is false', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ myFlag: false }));

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(false);
  });

  it('returns false when the flag is absent', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({}));

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(false);
  });

  it('returns false when config has no data yet', () => {
    mockUseBrowseConfig.mockReturnValue({ data: undefined });

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(false);
  });

  it('returns false when the flag value is truthy but not boolean true', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ myFlag: 'true' }));

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(false);
  });

  it('enables a flag when the session override enables it', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ myFlag: false }));
    mockUseFeatureFlagOverrides.mockReturnValue({ enabledFlags: ['myFlag'] });

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(true);
  });

  it('returns false when the session override does not enable the flag', () => {
    mockUseBrowseConfig.mockReturnValue(withLabs({ myFlag: false }));
    mockUseFeatureFlagOverrides.mockReturnValue({ enabledFlags: ['otherFlag'] });

    const { result } = renderHook(() => useFeatureFlag('myFlag'));

    expect(result.current).toBe(false);
  });
});
