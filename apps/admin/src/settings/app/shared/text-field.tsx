import { type ReactNode, type Ref, useId } from "react";
import { Field, FieldDescription, FieldError, FieldLabel, Input, InputGroup, InputGroupAddon, InputGroupInput } from "@tryghost/shade/components";

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
    autoFocus?: boolean;
    /** Renders the input inside an InputGroup with this inline-end addon (the legacy `rightPlaceholder`). */
    rightAddon?: ReactNode;
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
    autoFocus,
    rightAddon,
    onChange,
    onKeyDown,
    onBlur,
    onFocus,
}: TextFieldProps) {
    const id = useId();

    const inputProps = {
        "aria-invalid": error || undefined,
        autoComplete,
        autoFocus,
        "data-testid": testId,
        disabled,
        id,
        maxLength,
        placeholder,
        type,
        value: value ?? "",
        onBlur,
        onChange,
        onFocus,
        onKeyDown,
    };

    return (
        <Field data-invalid={error || undefined}>
            {title && <FieldLabel htmlFor={id}>{title}</FieldLabel>}
            {rightAddon ? (
                <InputGroup className="border-transparent bg-muted" data-invalid={error || undefined}>
                    <InputGroupInput ref={inputRef} {...inputProps} />
                    <InputGroupAddon align="inline-end">{rightAddon}</InputGroupAddon>
                </InputGroup>
            ) : (
                <Input ref={inputRef} {...inputProps} />
            )}
            {error && hint ? <FieldError>{hint}</FieldError> : hint ? <FieldDescription>{hint}</FieldDescription> : null}
        </Field>
    );
}
