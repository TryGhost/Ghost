import {render, fireEvent} from '@testing-library/react';
import InputField from './InputField';

const setup = (props = {}) => {
    const mockOnChangeFn = jest.fn();
    props = {
        name: 'test-input',
        label: 'Test Input',
        value: '',
        placeholder: 'Test placeholder',
        onChange: mockOnChangeFn,
        ...props
    };
    const utils = render(
        <InputField {...props} />
    );

    const inputEl = utils.getByLabelText(props.label);
    return {
        inputEl,
        mockOnChangeFn,
        ...utils
    };
};

describe('InputField', () => {
    test('renders', () => {
        const {inputEl} = setup();
        expect(inputEl).toBeInTheDocument();
    });

    test('calls onChange on value', () => {
        const {inputEl, mockOnChangeFn} = setup();
        fireEvent.change(inputEl, {target: {value: 'Test'}});

        expect(mockOnChangeFn).toHaveBeenCalled();
    });

    test('does not include autoComplete attribute value if not provided', () => {
        const {inputEl} = setup();
        expect(inputEl).toHaveAttribute('autoComplete', '');
    });

    test('applies autoComplete prop correctly', () => {
        const {inputEl} = setup({autoComplete: 'off'});
        expect(inputEl).toHaveAttribute('autoComplete', 'off');
    });
});
