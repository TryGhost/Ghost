import {HtmlField} from '@tryghost/admin-x-design-system';

type EmailFooterFieldProps = {
    value: string;
    onChange: (value: string) => void;
};

export const EmailFooterField: React.FC<EmailFooterFieldProps> = ({value, onChange}) => {
    return (
        <HtmlField
            hint='Any extra information or legal text'
            nodes='MINIMAL_NODES'
            placeholder=' '
            title='Email footer'
            value={value}
            onChange={onChange}
        />
    );
};
