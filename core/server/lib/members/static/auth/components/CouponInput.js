import FormInput from './FormInput';
import { IconName } from './icons';

export default ({value, disabled, error, children, onInput, className}) => (
    <FormInput
        type="text"
        name="coupon"
        label="coupon"
        value={value}
        error={error}
        icon={IconName}
        placeholder="Coupon..."
        required={false}
        disabled={disabled}
        className={className}
        onInput={onInput}>
        {children}
    </FormInput>
);
