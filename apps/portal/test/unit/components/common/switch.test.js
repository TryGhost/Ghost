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

    test('in presentational mode, hides itself from the accessibility tree and focus order', () => {
        const {container} = render(
            <Switch id="pres-switch" label="Presentational" onToggle={() => {}} presentational={true} />
        );
        const wrapper = container.querySelector('.gh-portal-for-switch');
        const input = container.querySelector('input[type="checkbox"]');

        // The whole widget is hidden from screen readers; the parent row
        // exposes role=button + aria-pressed instead.
        expect(wrapper).toHaveAttribute('aria-hidden', 'true');
        // The input is removed from the focus order so keyboard users do not
        // get a second tab stop after the row.
        expect(input).toHaveAttribute('tabindex', '-1');
        // aria-label is dropped because the input is no longer an accessible
        // control — leaving it would just clutter the SR tree if anything else
        // re-exposed it.
        expect(input).not.toHaveAttribute('aria-label');
    });

    test('non-presentational mode keeps the input accessible', () => {
        const {container} = render(
            <Switch id="acc-switch" label="Accessible" onToggle={() => {}} />
        );
        const wrapper = container.querySelector('.gh-portal-for-switch');
        const input = container.querySelector('input[type="checkbox"]');

        expect(wrapper).not.toHaveAttribute('aria-hidden');
        expect(input).not.toHaveAttribute('tabindex');
        expect(input).toHaveAttribute('aria-label', 'Accessible');
    });
});
