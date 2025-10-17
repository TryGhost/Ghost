import InputField from './InputField';

const FormInput = ({field, onChange, onBlur = () => { }, onKeyDown = () => {}}) => {
    if (!field) {
        return null;
    }
    return (
        <>
            <InputField
                key={field.name}
                label = {field.label}
                type={field.type}
                name={field.name}
                hidden={field.hidden}
                placeholder={field.placeholder}
                disabled={field.disabled}
                value={field.value}
                onKeyDown={onKeyDown}
                onChange={e => onChange(e, field)}
                onBlur={e => onBlur(e, field)}
                tabIndex={field.tabIndex}
                errorMessage={field.errorMessage}
                autoFocus={field.autoFocus}
            />
        </>
    );
};

function InputForm({fields, onChange, onBlur, onKeyDown}) {
    const inputFields = fields.map((field) => {
        return <FormInput field={field} key={field.name} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown} />;
    });

    return (
        <>
            {inputFields}
        </>
    );
}

export default InputForm;
