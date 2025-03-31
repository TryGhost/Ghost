import React, {useState, useEffect} from 'react';
import TextField, {TextFieldProps} from './TextField';

export type CurrencyFieldProps = Omit<TextFieldProps, 'type' | 'onChange' | 'value'> & {
    valueInCents?: number | '';
    currency?: string;
    onChange?: (cents: number) => void;
}

/**
 * A CurrencyField is a special type of [TextField](?path=/docs/global-form-textfield--docs) with
 * some parsing to input currency values. While editing you can enter any number of decimals, but
 * the value in `onChange` will be rounded and multiplied to get an integer number of cents.
 *
 * Available options are generally the same as TextField.
 */
const CurrencyField: React.FC<CurrencyFieldProps> = ({
    valueInCents = '',
    onChange,
    ...props
}) => {
    // Format the initial value using the same logic as onBlur
    const formatValue = (cents: number | '') => {
        if (cents === '' || cents === undefined) {
            return '';
        }
        const value = cents / 100;
        return value % 1 === 0 ? value.toString() : value.toFixed(2);
    };

    const [localValue, setLocalValue] = useState(formatValue(valueInCents));

    // While the user is editing we allow more lenient input
    const stripNonNumeric = (input: string) => input.replace(/[^\d.]+/g, '');

    // The saved value is strictly a number with 2 decimal places
    const forceCurrencyValue = (input: string) => {
        return Math.round(parseFloat(input.match(/[\d]+\.?[\d]{0,2}/)?.[0] || '0') * 100);
    };

    // Update localValue when valueInCents prop changes
    useEffect(() => {
        setLocalValue(formatValue(valueInCents));
    }, [valueInCents]);

    return <TextField
        {...props}
        value={localValue}
        onBlur={(e) => {
            const value = forceCurrencyValue(e.target.value) / 100;
            setLocalValue(value % 1 === 0 ? value.toString() : value.toFixed(2));
            // Only convert to cents on blur
            onChange?.(forceCurrencyValue(e.target.value));
            props.onBlur?.(e);
        }}
        onChange={(e) => {
            const stripped = stripNonNumeric(e.target.value);
            setLocalValue(stripped);
            // Don't convert to cents while typing
            // onChange?.(forceCurrencyValue(stripped));
        }}
    />;
};

export default CurrencyField;
