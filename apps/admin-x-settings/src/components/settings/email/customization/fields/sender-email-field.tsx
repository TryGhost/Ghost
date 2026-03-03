import {TextField} from '@tryghost/admin-x-design-system';

type SenderEmailFieldProps = {
    value: string;
    placeholder: string;
    error?: string;
    onChange: (value: string) => void;
    clearError: () => void;
};

export const SenderEmailField: React.FC<SenderEmailFieldProps> = ({value, placeholder, error, onChange, clearError}) => {
    return (
        <TextField
            error={Boolean(error)}
            hint={error}
            maxLength={191}
            placeholder={placeholder}
            title="Sender email address"
            value={value}
            onChange={event => onChange(event.target.value)}
            onKeyDown={clearError}
        />
    );
};
