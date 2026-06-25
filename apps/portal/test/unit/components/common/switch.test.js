import {render, fireEvent} from '@testing-library/react';
import Switch from '../../../../src/components/common/switch';

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

    test('calls onToggle with the new checked state when the input fires change', () => {
        const {mockOnToggle, container} = setup();
        const input = container.querySelector('input[type="checkbox"]');

        fireEvent.click(input);

        expect(mockOnToggle).toHaveBeenCalledTimes(1);
        expect(mockOnToggle).toHaveBeenCalledWith(expect.anything(), true);
    });

    test('does not call onToggle when disabled', () => {
        const mockOnToggle = vi.fn();
        const {container} = render(
            <Switch id="disabled-switch" label="Disabled" onToggle={mockOnToggle} disabled={true} />
        );
        const input = container.querySelector('input[type="checkbox"]');

        fireEvent.click(input);

        expect(mockOnToggle).not.toHaveBeenCalled();
    });

    test('does not stop event propagation from the wrapper', () => {
        const outerClickHandler = vi.fn();
        const mockOnToggle = vi.fn();
        const {container} = render(
            <div onClick={outerClickHandler}>
                <Switch id="bubbling-switch" label="Bubble" onToggle={mockOnToggle} />
            </div>
        );
        const input = container.querySelector('input[type="checkbox"]');

        fireEvent.click(input);

        expect(outerClickHandler).toHaveBeenCalled();
    });

    test('uses label prop as the input aria-label for screen readers', () => {
        const {container} = render(
            <Switch id="labelled-switch" label="My nice toggle" onToggle={() => {}} />
        );
        const input = container.querySelector('input[type="checkbox"]');

        expect(input).toHaveAttribute('aria-label', 'My nice toggle');
    });
});
