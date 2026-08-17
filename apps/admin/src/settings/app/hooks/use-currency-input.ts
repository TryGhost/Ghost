import {useEffect, useRef, useState} from 'react';

const stripNonNumeric = (input: string) => input.replace(/[^\d.]+/g, '');

const forceCurrencyValue = (input: string) => {
    return Math.round(parseFloat(input.match(/[\d]+\.?[\d]{0,2}/)?.[0] || '0') * 100);
};

const useCurrencyInput = (valueInCents: number | '', onChange?: (cents: number) => void) => {
    const [value, setValue] = useState(valueInCents === '' ? '' : ((valueInCents || 0) / 100).toString());
    const lastEmittedValue = useRef<number | ''>(valueInCents);

    useEffect(() => {
        if (!Object.is(valueInCents, lastEmittedValue.current)) {
            setValue(valueInCents === '' ? '' : ((valueInCents || 0) / 100).toString());
        }

        lastEmittedValue.current = valueInCents;
    }, [valueInCents]);

    return {
        value,
        onBlur: () => setValue((forceCurrencyValue(value) / 100).toString()),
        onChange: (input: string) => {
            const cents = forceCurrencyValue(input);

            setValue(stripNonNumeric(input));
            lastEmittedValue.current = cents;
            onChange?.(cents);
        }
    };
};

export default useCurrencyInput;
