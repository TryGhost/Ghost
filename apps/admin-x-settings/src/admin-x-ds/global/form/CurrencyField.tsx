import React, {useState} from 'react';
import TextField, {TextFieldProps} from './TextField';
import {currencyFromDecimal, currencyToDecimal} from '../../../utils/currency';

export type CurrencyFieldProps = Omit<TextFieldProps, 'type' | 'onChange'> & {
    currency?: string
    onChange?: (value: number) => void
}

const CurrencyField: React.FC<CurrencyFieldProps> = ({
    value,
    onChange,
    ...props
}) => {
    const [localValue, setLocalValue] = useState(currencyToDecimal(parseInt(value || '0')).toString());

    // While the user is editing we allow more lenient input, e.g. "1.32.566" to make it easier to type and change
    const stripNonNumeric = (input: string) => input.replace(/[^\d.]+/g, '');

    // The saved value is strictly a number with 2 decimal places
    const forceCurrencyValue = (input: string) => {
        return currencyFromDecimal(parseFloat(input.match(/[\d]+\.?[\d]{0,2}/)?.[0] || '0'));
    };

    return <TextField
        {...props}
        value={localValue}
        onBlur={(e) => {
            setLocalValue(currencyToDecimal(forceCurrencyValue(e.target.value)).toString());
            props.onBlur?.(e);
        }}
        onChange={(e) => {
            setLocalValue(stripNonNumeric(e.target.value));
            onChange?.(forceCurrencyValue(e.target.value));
        }}
    />;
};

export default CurrencyField;
