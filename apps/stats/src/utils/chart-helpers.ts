/**
 * Calculates Y-axis ticks based on the data values
 * @param data Array of data points with numeric values
 * @returns Array of tick values
 */
export const getYTicks = (data: { value: number }[]): number[] => {
    if (!data?.length) {
        return [];
    }
    const values = data.map(d => Number(d.value));
    const max = Math.max(...values);
    const min = Math.min(...values);
    const step = Math.pow(10, Math.floor(Math.log10(max - min)));
    const ticks = [];
    for (let i = Math.floor(min / step) * step; i <= Math.ceil(max / step) * step; i += step) {
        ticks.push(i);
    }
    return ticks;
};

/**
 * Calculates the width needed for the Y-axis based on the formatted tick values
 * @param ticks Array of numeric tick values
 * @param formatter Function to format the tick values
 * @returns Width in pixels needed for the Y-axis
 */
export const calculateYAxisWidth = (ticks: number[], formatter: (value: number) => string): number => {
    if (!ticks.length) {
        return 40;
    }

    // Get the longest formatted tick value
    const maxFormattedLength = Math.max(...ticks.map(tick => formatter(tick).length));

    // Approximate width based on character count (assuming monospace font)
    // Add padding for safety
    const width = Math.max(20, maxFormattedLength * 8 + 8);
    return width;
};
