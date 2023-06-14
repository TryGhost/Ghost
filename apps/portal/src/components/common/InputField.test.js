import React from 'react';
import {render, fireEvent} from '@testing-library/react';
import InputField from './InputField';

const setup = (overrides = {}) => {
    const mockOnChangeFn = jest.fn();
    const props = {
        name: 'test-input',
        label: 'Test Input',
        value: '',
        placeholder: 'Test placeholder',
        onChange: mockOnChangeFn
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
});
