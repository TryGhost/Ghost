import {render, fireEvent} from '@testing-library/react';
import Switch from './Switch';

const setup = () => {
    const mockOnToggle = vi.fn();
    const props = {
        onToggle: mockOnToggle,
        label: 'Test Switch',
        id: 'test-switch'
    };
    const utils = render(
        <Switch {...props} />
    );

    const checkboxEl = utils.getByTestId('switch-input');
    return {
        checkboxEl,
        mockOnToggle,
        ...utils
    };
};

describe('Switch', () => {
    test('renders', () => {
        const {checkboxEl} = setup();
        expect(checkboxEl).toBeInTheDocument();
    });

    test('calls onToggle on click', () => {
        const {checkboxEl, mockOnToggle} = setup();
        fireEvent.click(checkboxEl);

        expect(mockOnToggle).toHaveBeenCalled();
    });
});
