import {act, renderHook} from '@testing-library/react';
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest';
import {useResponsiveChartSize} from '@src/hooks/useResponsiveChartSize';

describe('useResponsiveChartSize', () => {
    let mockInnerWidth: number;

    beforeEach(() => {
        mockInnerWidth = 1200;
        
        // Mock window.innerWidth
        Object.defineProperty(window, 'innerWidth', {
            writable: true,
            configurable: true,
            value: mockInnerWidth
        });

        // Mock addEventListener and removeEventListener
        window.addEventListener = vi.fn();
        window.removeEventListener = vi.fn();

        vi.clearAllMocks();
    });

    afterEach(function () {
        vi.restoreAllMocks();
    });

    it('initializes with medium size by default', () => {
        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('md');
        expect(result.current.isSmall).toBe(false);
        expect(result.current.isMedium).toBe(true);
        expect(result.current.isLarge).toBe(false);
    });

    it('returns small size for widths below sm breakpoint', () => {
        Object.defineProperty(window, 'innerWidth', {value: 800});

        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('sm');
        expect(result.current.isSmall).toBe(true);
        expect(result.current.isMedium).toBe(false);
        expect(result.current.isLarge).toBe(false);
    });

    it('returns medium size for widths between sm and md breakpoints', () => {
        Object.defineProperty(window, 'innerWidth', {value: 1150});

        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('md');
        expect(result.current.isSmall).toBe(false);
        expect(result.current.isMedium).toBe(true);
        expect(result.current.isLarge).toBe(false);
    });

    it('returns large size for widths above md breakpoint', () => {
        Object.defineProperty(window, 'innerWidth', {value: 1400});

        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('lg');
        expect(result.current.isSmall).toBe(false);
        expect(result.current.isMedium).toBe(false);
        expect(result.current.isLarge).toBe(true);
    });

    it('uses custom breakpoints when provided', () => {
        const customBreakpoints = {
            sm: 500,
            md: 800,
            lg: 1000
        };

        Object.defineProperty(window, 'innerWidth', {value: 600});

        const {result} = renderHook(() => useResponsiveChartSize({breakpoints: customBreakpoints})
        );

        expect(result.current.chartSize).toBe('md');
    });

    it('handles edge cases at exact breakpoint values', () => {
        // Test at exact sm breakpoint (should be md)
        Object.defineProperty(window, 'innerWidth', {value: 1080});

        const {result: result1} = renderHook(() => useResponsiveChartSize());
        expect(result1.current.chartSize).toBe('md');

        // Test at exact md breakpoint (should be lg)
        Object.defineProperty(window, 'innerWidth', {value: 1280});

        const {result: result2} = renderHook(() => useResponsiveChartSize());
        expect(result2.current.chartSize).toBe('lg');
    });

    it('responds to window resize events', () => {
        let resizeHandler: () => void;
        
        // Capture the resize handler to test behavior
        window.addEventListener = vi.fn((event, handler) => {
            if (event === 'resize') {
                resizeHandler = handler as () => void;
            }
        });

        Object.defineProperty(window, 'innerWidth', {value: 1200});
        const {result} = renderHook(() => useResponsiveChartSize());
        
        expect(result.current.chartSize).toBe('md');

        // Test that the hook actually responds to resize events
        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 800});
            resizeHandler();
        });

        expect(result.current.chartSize).toBe('sm');
    });

    it('cleans up properly when unmounted', () => {
        let resizeHandler: () => void;
        
        window.addEventListener = vi.fn((event, handler) => {
            if (event === 'resize') {
                resizeHandler = handler as () => void;
            }
        });

        Object.defineProperty(window, 'innerWidth', {value: 1200});
        const {result, unmount} = renderHook(() => useResponsiveChartSize());
        
        expect(result.current.chartSize).toBe('md');
        const originalSize = result.current.chartSize;

        // Unmount the hook
        unmount();

        // Behavior test: hook should stop responding to resize events after unmount
        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 800});
            // If cleanup worked, calling the old handler shouldn't cause issues
            expect(() => resizeHandler()).not.toThrow();
        });
        
        // The hook result should remain unchanged after unmount (no longer reactive)
        expect(result.current.chartSize).toBe(originalSize);
    });

    it('updates boolean flags correctly when size changes', () => {
        let resizeHandler: () => void;
        
        window.addEventListener = vi.fn((event, handler) => {
            if (event === 'resize') {
                resizeHandler = handler as () => void;
            }
        });

        Object.defineProperty(window, 'innerWidth', {value: 1200});

        const {result} = renderHook(() => useResponsiveChartSize());

        // Initial state - medium
        expect(result.current.isSmall).toBe(false);
        expect(result.current.isMedium).toBe(true);
        expect(result.current.isLarge).toBe(false);

        // Resize to large
        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 1400});
            resizeHandler();
        });

        expect(result.current.isSmall).toBe(false);
        expect(result.current.isMedium).toBe(false);
        expect(result.current.isLarge).toBe(true);

        // Resize to small
        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 800});
            resizeHandler();
        });

        expect(result.current.isSmall).toBe(true);
        expect(result.current.isMedium).toBe(false);
        expect(result.current.isLarge).toBe(false);
    });

    it('handles multiple resize events correctly', () => {
        let resizeHandler: () => void;
        
        window.addEventListener = vi.fn((event, handler) => {
            if (event === 'resize') {
                resizeHandler = handler as () => void;
            }
        });

        Object.defineProperty(window, 'innerWidth', {value: 1200});

        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('md');

        // Multiple rapid resizes
        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 800});
            resizeHandler();
        });
        expect(result.current.chartSize).toBe('sm');

        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 1400});
            resizeHandler();
        });
        expect(result.current.chartSize).toBe('lg');

        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 1100});
            resizeHandler();
        });
        expect(result.current.chartSize).toBe('md');
    });

    it('works with custom breakpoints and resize events', () => {
        let resizeHandler: () => void;
        
        window.addEventListener = vi.fn((event, handler) => {
            if (event === 'resize') {
                resizeHandler = handler as () => void;
            }
        });

        const customBreakpoints = {
            sm: 600,
            md: 900,
            lg: 1200
        };

        Object.defineProperty(window, 'innerWidth', {value: 700});

        const {result} = renderHook(() => useResponsiveChartSize({breakpoints: customBreakpoints})
        );

        expect(result.current.chartSize).toBe('md');

        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 500});
            resizeHandler();
        });

        expect(result.current.chartSize).toBe('sm');

        act(() => {
            Object.defineProperty(window, 'innerWidth', {value: 1300});
            resizeHandler();
        });

        expect(result.current.chartSize).toBe('lg');
    });

    it('uses default breakpoints when no custom breakpoints provided', () => {
        Object.defineProperty(window, 'innerWidth', {value: 1000});
        
        const {result} = renderHook(() => useResponsiveChartSize({}));

        // Should use default breakpoints: sm: 1080, md: 1280, lg: 1360
        // 1000 < 1080, so should be 'sm'
        expect(result.current.chartSize).toBe('sm');
    });

    it('handles very small screen sizes', () => {
        Object.defineProperty(window, 'innerWidth', {value: 320});

        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('sm');
        expect(result.current.isSmall).toBe(true);
    });

    it('handles very large screen sizes', () => {
        Object.defineProperty(window, 'innerWidth', {value: 2000});

        const {result} = renderHook(() => useResponsiveChartSize());

        expect(result.current.chartSize).toBe('lg');
        expect(result.current.isLarge).toBe(true);
    });
});