import FormInput from './FormInput';
import { IconEmail } from './icons';

export default ({value, error, children, onInput, className}) => (
    <FormInput
        type="email"
        name="email"
        label="Email"
        value={value}
        error={error}
        icon={IconEmail}
        placeholder="Email..."
        required={true}
        className={className}
        onInput={onInput}>
        {children}
    </FormInput>
);
