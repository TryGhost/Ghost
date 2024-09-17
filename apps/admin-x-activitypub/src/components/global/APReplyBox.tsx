import React, {HTMLProps, useId} from 'react';

import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from './APAvatar';
import clsx from 'clsx';
import {Button} from '@tryghost/admin-x-design-system';
// import {useFocusContext} from '@tryghost/admin-x-design-system/types/providers/DesignSystemProvider';

export interface APTextAreaProps extends HTMLProps<HTMLTextAreaElement> {
    inputRef?: React.RefObject<HTMLTextAreaElement>;
    title?: string;
    value?: string;
    rows?: number;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    className?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
}

const APReplyBox: React.FC<APTextAreaProps> = ({
    inputRef,
    title,
    value,
    rows = 1,
    maxLength,
    error,
    placeholder,
    hint,
    className,
    // onChange,
    // onFocus,
    // onBlur,
    ...props
}) => {
    const id = useId();
    // const {setFocusState} = useFocusContext();

    // const handleFocus: FocusEventHandler<HTMLTextAreaElement> = (e) => {
    //     setFocusState(true);
    //     onFocus?.(e);
    // };

    // const handleBlur: FocusEventHandler<HTMLTextAreaElement> = (e) => {
    //     setFocusState(false);
    //     onBlur?.(e);
    // };

    const styles = clsx(
        'ap-textarea order-2 w-full resize-none rounded-lg border py-2 pr-3 text-[1.5rem] transition-all dark:text-white',
        error ? 'border-red' : 'border-transparent placeholder:text-grey-500 dark:placeholder:text-grey-800',
        title && 'mt-1.5',
        className
    );

    return (
        <div className='flex w-full gap-x-3 py-6'>
            <APAvatar/>
            <div className='relative w-full'>
                <FormPrimitive.Root asChild>
                    <div className='flex w-full flex-col'>
                        <FormPrimitive.Field name={id} asChild>
                            <FormPrimitive.Control asChild>
                                <textarea
                                    ref={inputRef}
                                    className={styles}
                                    id={id}
                                    maxLength={maxLength}
                                    placeholder={placeholder}
                                    rows={rows}
                                    value={value}
                                    // onBlur={handleBlur}
                                    // onChange={onChange}
                                    // onFocus={handleFocus}
                                    {...props}>
                                </textarea>
                            </FormPrimitive.Control>
                        </FormPrimitive.Field>
                        {title}
                        {hint}
                    </div>
                </FormPrimitive.Root>
                <div className='absolute bottom-[6px] right-[9px] flex space-x-4 transition-[opacity] duration-150'>
                    <Button color='black' id='post' label='Post' size='sm' />
                </div>
            </div>
        </div>
    );
};

export default APReplyBox;
