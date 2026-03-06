import {TextField} from '@tryghost/admin-x-design-system';
import {useEffect, useRef, useState} from 'react';

type ReplyToEmailFieldProps = {
    renderedValue: string;
    placeholder: string;
    error?: string;
    onChange: (value: string) => void;
    clearError: () => void;
};

export const ReplyToEmailField: React.FC<ReplyToEmailFieldProps> = ({renderedValue, placeholder, error, onChange, clearError}) => {
    const [inputValue, setInputValue] = useState(renderedValue);
    const isEditingRef = useRef(false);

    useEffect(() => {
        if (!isEditingRef.current) {
            setInputValue(renderedValue);
        }
    }, [renderedValue]);

    return (
        <TextField
            error={Boolean(error)}
            hint={error}
            maxLength={191}
            placeholder={placeholder}
            title="Reply-to email"
            value={inputValue}
            onBlur={() => {
                isEditingRef.current = false;
                setInputValue(renderedValue);
            }}
            onChange={(event) => {
                isEditingRef.current = true;
                setInputValue(event.target.value);
                onChange(event.target.value);
            }}
            onKeyDown={clearError}
        />
    );
};
