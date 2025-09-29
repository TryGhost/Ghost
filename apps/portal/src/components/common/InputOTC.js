import {useContext} from 'react';
import {OTPInput as OTCInput, OTPInputContext as OTCInputContext} from 'input-otp';
import {REGEXP_ONLY_DIGITS} from 'input-otp';
import {cn} from '../../utils/cn';

/**
 * @typedef {Object} InputOTCProps
 * @property {import('react').ReactNode} children
 * @property {string} id - Input id used for label association
 * @property {string} label - Accessible label announced by screen readers
 * @property {string} [className]
 * @property {string} [containerClassName]
 * @property {boolean} [hasError] - When true, shows invalid styles and sets aria-invalid
 * @property {number} [maxLength]
 * @property {string} [pattern] - Value pattern; defaults to digits only
 */

/**
 * One-time code input. Thin wrapper over input-otp with portal styles.
 * @param {InputOTCProps & Record<string, any>} props
 */
function InputOTC({
    children,
    id,
    label,
    className,
    containerClassName,
    hasError,
    maxLength = 6,
    pattern = REGEXP_ONLY_DIGITS,
    ...props
}) {
    return (
        <div className="gh-portal-input-otc-root" data-invalid={hasError}>
            <label htmlFor={id} className="sr-only">
                {label}
            </label>
            <OTCInput
                id={id}
                type="text"
                data-slot="input-otc"
                containerClassName={cn(
                    'gh-portal-input-otc-container',
                    containerClassName
                )}
                className={cn('gh-portal-input-otc', hasError && 'error', className)}
                data-invalid={hasError}
                aria-invalid={hasError}
                aria-label={label}
                pattern={pattern}
                maxLength={maxLength}
                {...props}
            >
                {children}
            </OTCInput>
        </div>
    );
}

/**
 * @param {{className?: string} & Record<string, any>} props
 */
function InputOTCGroup({className, ...props}) {
    return (
        <div
            data-slot="input-otc-group"
            className={cn('gh-portal-input-otc-group', className)}
            {...props}
        />
    );
}

/**
 * @param {{index: number, className?: string} & Record<string, any>} props
 */
function InputOTCSlot({
    index,
    className,
    ...props
}) {
    const inputOtcContext = useContext(OTCInputContext);
    const {char, hasFakeCaret, isActive} = inputOtcContext?.slots[index] ?? {};

    return (
        <div
            data-slot="input-otc-slot"
            data-active={isActive}
            className={cn(
                'gh-portal-input-otc-slot',
                className
            )}
            {...props}
        >
            {char}
            {hasFakeCaret && (
                <div className="gh-portal-input-otc-caret-overlay">
                    <div className="gh-portal-input-otc-caret" />
                </div>
            )}
        </div>
    );
}

export {InputOTC, InputOTCGroup, InputOTCSlot};