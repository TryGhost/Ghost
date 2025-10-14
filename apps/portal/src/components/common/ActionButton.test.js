import {render, fireEvent} from '@testing-library/react';
import ActionButton from './ActionButton';

const setup = () => {
    const mockOnClickFn = vi.fn();
    const props = {
        label: 'Test Action Button', onClick: mockOnClickFn, disabled: false
    };
    const utils = render(
        <ActionButton {...props} />
    );

    const buttonEl = utils.queryByRole('button', {name: props.label});
    return {
        buttonEl,
        mockOnClickFn,
        ...utils
    };
};

describe('ActionButton', () => {
    test('renders', () => {
        const {buttonEl} = setup();
        expect(buttonEl).toBeInTheDocument();
    });

    test('fires onClick', () => {
        const {buttonEl, mockOnClickFn} = setup();

        fireEvent.click(buttonEl);
        expect(mockOnClickFn).toHaveBeenCalled();
    });
});
