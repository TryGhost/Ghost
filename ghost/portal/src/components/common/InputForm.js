import React, {Component} from 'react';
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
                placeholder={field.placeholder}
                disabled={field.disabled}
                value={field.value}
                onKeyDown={onKeyDown}
                onChange={e => onChange(e, field)}
                onBlur={e => onBlur(e, field)}
                tabIndex={field.tabindex}
                errorMessage={field.errorMessage}
                autoFocus={field.autoFocus}
            />
        </>
    );
};

class InputForm extends Component {
    constructor(props) {
        super(props);
        this.state = { };
    }

    render() {
        const {fields, onChange, onBlur, onKeyDown} = this.props;
        const inputFields = fields.map((field) => {
            return <FormInput field={field} key={field.name} onChange={onChange} onBlur={onBlur} onKeyDown={onKeyDown} />;
        });
        return (
            <>
                {inputFields}
            </>
        );
    }
}

export default InputForm;
