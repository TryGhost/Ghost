import Heading from '../Heading';
import Hint from '../Hint';
import React, {FocusEventHandler, useId} from 'react';
import clsx from 'clsx';
import {useFocusContext} from '../../providers/DesignSystemProvider';
import * as FormPrimitive from '@radix-ui/react-form';

export type TextFieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
    inputRef?: React.RefObject<HTMLInputElement>;
    title?: string;
    titleColor?: 'auto' | 'black' | 'grey';
    hideTitle?: boolean;
    type?: React.InputHTMLAttributes<HTMLInputElement>['type'];
    value?: string;
    error?: boolean;
    placeholder?: string;
    rightPlaceholder?: React.ReactNode;
    hint?: React.ReactNode;
    clearBg?: boolean;
    onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void;
    onBlur?: (event: React.FocusEvent<HTMLInputElement>) => void;
    className?: string;
    maxLength?: number;
    containerClassName?: string;
    hintClassName?: string;
    unstyled?: boolean;
    disabled?: boolean;
    border?: boolean;
    autoFocus?: boolean;
}

const TextField: React.FC<TextFieldProps> = ({
    type = 'text',
    inputRef,
    title,
    hideTitle,
    value,
    error,
    placeholder,
    rightPlaceholder,
    hint,
    onChange,
    onFocus,
    onBlur,
    clearBg = false,
    className = '',
    maxLength,
    containerClassName = '',
    hintClassName = '',
    unstyled = false,
    disabled,
    ...props
}) => {
    const id = useId();
    const {setFocusState} = useFocusContext();

    const handleFocus: FocusEventHandler<HTMLInputElement> = (e) => {
        onFocus?.(e);
        setFocusState(true);
    };

    const handleBlur: FocusEventHandler<HTMLInputElement> = (e) => {
        onBlur?.(e);
        setFocusState(false);
    };

    const fieldContainerClasses = clsx(
        'relative order-2 flex w-full items-center',
        (title && !hideTitle) && `mt-1.5`
    );

    const bgClasses = !unstyled && clsx(
        'dark:peer-hover:bg-grey-925 dark:peer-focus:bg-grey-950 absolute inset-0 rounded-lg border text-grey-300 transition-colors peer-hover:bg-grey-100 peer-focus:border-green peer-focus:bg-white peer-focus:shadow-[0_0_0_2px_rgba(48,207,67,.25)]',
        error ? `border-red bg-white dark:bg-grey-925` : 'border-transparent bg-grey-150 dark:bg-grey-900',
        disabled && 'dark:peer-hover:bg-grey-950 bg-grey-50 peer-hover:bg-grey-50 dark:bg-grey-950'
    );

    const textFieldClasses = !unstyled && clsx(
        'peer z-[1] order-2 h-9 w-full bg-transparent px-3 py-1.5 text-sm placeholder:text-grey-500 md:h-[38px] md:py-2 md:text-md dark:placeholder:text-grey-700',
        disabled ? 'cursor-not-allowed text-grey-600 opacity-60 dark:text-grey-800' : 'dark:text-white',
        rightPlaceholder ? 'w-0 grow rounded-l-lg' : 'rounded-lg',
        className
    );

    const rightPlaceholderClasses = !unstyled && clsx(
        'z-[1] order-3 rounded-r-lg',
        (rightPlaceholder ?
            ((typeof (rightPlaceholder) === 'string') ? 'flex h-8 items-center py-1 pr-3 text-right text-sm text-grey-500 md:h-9 md:text-base' : 'h-9 pr-1')
            : 'pr-2')
    );

    let field = <></>;

    const inputField = <input
        ref={inputRef}
        className={textFieldClasses || className}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        placeholder={placeholder}
        type={type}
        value={value}
        onBlur={handleBlur}
        onChange={onChange}
        onFocus={handleFocus}
        {...props} />;

    field = (
        <FormPrimitive.Field name={id} asChild>
            <div className={fieldContainerClasses}>
                <FormPrimitive.Control asChild>
                    {inputField}
                </FormPrimitive.Control>
                {!unstyled && !clearBg && <div className={bgClasses ? bgClasses : ''}></div>}
                {rightPlaceholder && <span className={rightPlaceholderClasses || ''}>{rightPlaceholder}</span>}
            </div>
        </FormPrimitive.Field>
    );

    hintClassName = clsx(
        'order-3',
        hintClassName
    );

    containerClassName = clsx(
        'flex flex-col',
        containerClassName
    );

    if (title || hint) {
        return (
            <FormPrimitive.Root asChild>
                <div className={containerClassName}>
                    {field}
                    {title && <Heading className={hideTitle ? 'sr-only' : 'order-1'} htmlFor={id} useLabelTag={true}>{title}</Heading>}
                    {hint && <Hint className={hintClassName} color={error ? 'red' : 'default'}>{hint}</Hint>}
                </div>
            </FormPrimitive.Root>
        );
    } else {
        return (
            <FormPrimitive.Root asChild>
                {field}
            </FormPrimitive.Root>
        );
    }
};

export default TextField;
