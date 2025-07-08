import CustomTooltipContent from '@src/components/chart/CustomTooltipContent';
import {describe, expect, it, vi} from 'vitest';
import {render, screen} from '@testing-library/react';

// Mock the formatDisplayDate function from @tryghost/shade
vi.mock('@tryghost/shade', () => ({
    formatDisplayDate: (date: string) => `Formatted: ${date}`,
    formatDisplayDateWithRange: (date: string) => `Formatted: ${date}`
}));

describe('CustomTooltipContent Component', () => {
    it('renders null when not active', () => {
        const {container} = render(<CustomTooltipContent active={false} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders null when payload is empty', () => {
        const {container} = render(<CustomTooltipContent active={true} payload={[]} />);
        expect(container.firstChild).toBeNull();
    });

    it('renders with proper data', () => {
        const mockPayload = [{
            value: 1234,
            payload: {
                date: '2023-05-15',
                label: 'Test Label'
            }
        }];

        render(<CustomTooltipContent active={true} payload={mockPayload} />);

        // Check that the date is displayed and formatted
        expect(screen.getByText('Formatted: 2023-05-15')).toBeInTheDocument();

        // Check that the label is displayed
        expect(screen.getByText('Test Label')).toBeInTheDocument();

        // Check that the value is displayed
        expect(screen.getByText('1234')).toBeInTheDocument();
    });

    it('uses formattedValue when available', () => {
        const mockPayload = [{
            value: 1234,
            payload: {
                date: '2023-05-15',
                formattedValue: '$1,234',
                label: 'Test Label'
            }
        }];

        render(<CustomTooltipContent active={true} payload={mockPayload} />);

        // Check that the formatted value is used instead of the raw value
        expect(screen.getByText('$1,234')).toBeInTheDocument();
        expect(screen.queryByText('1234')).not.toBeInTheDocument();
    });
});