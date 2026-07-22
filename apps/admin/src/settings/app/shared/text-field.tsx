import { type ReactNode, type Ref, useId } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input } from "@tryghost/shade/components";

/**
 * A labelled text input with hint/error messaging — the Shade equivalent of
 * the legacy TextField API, so group ports stay mechanical: `error` switches
 * the hint line to the error message, exactly like the legacy component.
 */

export interface TextFieldProps {
    title?: string;
    value?: string;
    placeholder?: string;
    hint?: ReactNode;
    error?: boolean;
    maxLength?: number;
    type?: string;
    disabled?: boolean;
    inputRef?: Ref<HTMLInputElement>;
    testId?: string;
    autoComplete?: string;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onKeyDown?: (event: React.KeyboardEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    onFocus?: (event: React.FocusEvent<HTMLInputElement>) => void;
}

export function TextField({
    title,
    value,
    placeholder,
    hint,
    error,
    maxLength,
    type = "text",
    disabled,
    inputRef,
    testId,
    autoComplete,
    onChange,
    onKeyDown,
    onBlur,
    onFocus,
}: TextFieldProps) {
    const id = useId();

    return (
        <Field data-invalid={error || undefined}>
            {title && <FieldLabel htmlFor={id}>{title}</FieldLabel>}
            <Input
                ref={inputRef}
                aria-invalid={error || undefined}
                autoComplete={autoComplete}
                data-testid={testId}
                disabled={disabled}
                id={id}
                maxLength={maxLength}
                placeholder={placeholder}
                type={type}
                value={value ?? ""}
                onBlur={onBlur}
                onChange={onChange}
                onFocus={onFocus}
                onKeyDown={onKeyDown}
            />
            {error && hint ? <FieldError>{hint}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
        </Field>
    );
}
