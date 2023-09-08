import Heading from '../Heading';
import Hint from '../Hint';
import React, {useId} from 'react';
import clsx from 'clsx';

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
    clearBg = true,
    onChange,
    onBlur,
    className = '',
    maxLength,
    containerClassName = '',
    hintClassName = '',
    unstyled = false,
    disabled,
    border = true,
    ...props
}) => {
    const id = useId();

    const disabledBorderClasses = border && 'border-grey-300';
    const enabledBorderClasses = border && 'border-grey-500 hover:border-grey-700 focus:border-black';

    const textFieldClasses = !unstyled && clsx(
        'peer order-2 h-8 w-full py-1 text-sm md:h-10 md:py-2 md:text-base',
        border && 'border-b',
        !border && '-mb-1.5',
        clearBg ? 'bg-transparent' : 'bg-grey-75 px-[10px]',
        error && border ? `border-red` : `${disabled ? disabledBorderClasses : enabledBorderClasses}`,
        (title && !hideTitle && !clearBg) && `mt-2`,
        (disabled ? 'cursor-not-allowed text-grey-700' : ''),
        rightPlaceholder && 'w-0 grow',
        className
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
        onBlur={onBlur}
        onChange={onChange}
        {...props} />;

    if (rightPlaceholder) {
        const rightPHEnabledBorderClasses = 'border-grey-500 peer-hover:border-grey-700 peer-focus:border-black';
        const rightPHClasses = !unstyled && clsx(
            'order-3',
            border && 'border-b',
            !border && '-mb-1.5',
            (typeof (rightPlaceholder) === 'string') ? 'h-8 py-1 text-right text-sm text-grey-500 md:h-10 md:py-2 md:text-base' : 'h-10',
            error && border ? `border-red` : `${disabled ? disabledBorderClasses : rightPHEnabledBorderClasses}`
        );

        field = (
            <div className='order-2 flex w-full items-center'>
                {inputField}
                <span className={rightPHClasses || ''}>{rightPlaceholder}</span>
            </div>
        );
    } else {
        field = inputField;
    }

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
            <div className={containerClassName}>
                {field}
                {title && <Heading className={hideTitle ? 'sr-only' : 'order-1 !text-grey-700 peer-focus:!text-black'} htmlFor={id} useLabelTag={true}>{title}</Heading>}
                {hint && <Hint className={hintClassName} color={error ? 'red' : ''}>{hint}</Hint>}
            </div>
        );
    } else {
        return field;
    }
};

export default TextField;
