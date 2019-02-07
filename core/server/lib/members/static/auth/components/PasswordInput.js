import FormInput from './FormInput';
import { IconLock } from './icons';

export default ({value, error, children, onInput, className}) => (
    <FormInput
        type="password"
        name="password"
        label="Password"
        value={value}
        error={error}
        icon={IconLock}
        placeholder="Password..."
        required={true}
        className={className}
        onInput={onInput}>
        { children }
    </FormInput>
);
