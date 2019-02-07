import FormInput from './FormInput';
import { IconName } from './icons';

export default ({value, error, children, onInput, className}) => (
    <FormInput
        type="text"
        name="name"
        label="Name"
        value={value}
        error={error}
        icon={IconName}
        placeholder="Name..."
        required={true}
        className={className}
        onInput={onInput}>
        {children}
    </FormInput>
);
