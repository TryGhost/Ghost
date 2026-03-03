import {TextField} from '@tryghost/admin-x-design-system';

type SenderNameFieldProps = {
    value: string;
    placeholder?: string;
    onChange: (value: string) => void;
};

export const SenderNameField: React.FC<SenderNameFieldProps> = ({value, placeholder, onChange}) => {
    return <TextField
        maxLength={191}
        placeholder={placeholder}
        title="Sender name"
        value={value}
        onChange={event => onChange(event.target.value)}
    />;
};
