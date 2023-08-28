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

    const forceCurrencyValue = (input: string) => {
        return currencyFromDecimal(parseFloat(input.match(/[\d]+\.?[\d]{0,2}/)?.[0] || '0'));
    };

    return <TextField
        {...props}
        value={localValue}
        onChange={(e) => {
            setLocalValue(e.target.value);
            onChange?.(forceCurrencyValue(e.target.value));
        }}
    />;
};

export default CurrencyField;
