import {useEffect, useState} from 'react';

export type ChartSize = 'sm' | 'md' | 'lg';

interface UseResponsiveChartSizeProps {
    breakpoints?: {
        sm: number;
        md: number;
        lg: number;
    };
}

export const useResponsiveChartSize = ({
    breakpoints = {
        sm: 1080,
        md: 1280,
        lg: 1360
    }
}: UseResponsiveChartSizeProps = {}) => {
    const [chartSize, setChartSize] = useState<ChartSize>('md');

    useEffect(() => {
        const updateSize = () => {
            const width = window.innerWidth;

            if (width < breakpoints.sm) {
                setChartSize('sm');
            } else if (width < breakpoints.md) {
                setChartSize('md');
            } else {
                setChartSize('lg');
            }
        };

        // Set initial size
        updateSize();

        // Add resize listener
        window.addEventListener('resize', updateSize);

        // Cleanup
        return () => window.removeEventListener('resize', updateSize);
    }, [breakpoints]);

    return {
        chartSize,
        isSmall: chartSize === 'sm',
        isMedium: chartSize === 'md',
        isLarge: chartSize === 'lg'
    };
};
