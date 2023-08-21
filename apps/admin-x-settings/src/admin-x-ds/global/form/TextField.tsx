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
        'peer order-2 h-10 w-full py-2',
        border && 'border-b',
        !border && '-mb-1.5',
        clearBg ? 'bg-transparent' : 'bg-grey-75 px-[10px]',
        error && border ? `border-red` : `${disabled ? disabledBorderClasses : enabledBorderClasses}`,
        (title && !hideTitle && !clearBg) && `mt-2`,
        (disabled ? 'text-grey-700' : ''),
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
            (typeof (rightPlaceholder) === 'string') ? 'h-10 py-2 text-right text-grey-500' : 'h-10',
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

    if (title || hint) {
        return (
            <div className={`flex flex-col ${containerClassName}`}>
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
