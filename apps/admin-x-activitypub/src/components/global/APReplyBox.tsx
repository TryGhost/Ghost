import React, {HTMLProps, useId, useState} from 'react';

import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from './APAvatar';
import clsx from 'clsx';
import getUsername from '../../utils/get-username';
import {Button} from '@tryghost/admin-x-design-system';
import {ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {useReplyMutationForUser} from '../../hooks/useActivityPubQueries';
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
    object: ObjectProperties;
}

const APReplyBox: React.FC<APTextAreaProps> = ({
    inputRef,
    title,
    value,
    rows = 1,
    maxLength,
    error,
    hint,
    className,
    object,
    // onChange,
    // onFocus,
    // onBlur,
    ...props
}) => {
    const id = useId();
    const [textValue, setTextValue] = useState(''); // Manage the textarea value with state
    const replyMutation = useReplyMutationForUser('index');

    const styles = clsx(
        'ap-textarea order-2 w-full resize-none rounded-lg border py-2 pr-3 text-[1.5rem] transition-all dark:text-white',
        error ? 'border-red' : 'border-transparent placeholder:text-grey-500 dark:placeholder:text-grey-800',
        title && 'mt-1.5',
        className
    );

    async function handleClick(event: React.MouseEvent) {
        event.preventDefault();
        await replyMutation.mutate({id: object.id, content: textValue});
    }

    function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setTextValue(event.target.value); // Update the state on every change
    }

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
                                    placeholder={`Reply to ${getUsername(object.attributedTo)}...`}
                                    rows={rows}
                                    value={value}
                                    onChange={handleChange}
                                    // onBlur={handleBlur}
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
                    <Button disabled={replyMutation.isLoading} loading={replyMutation.isLoading} color='black' id='post' label='Post' size='sm' onClick={handleClick} />
                </div>
            </div>
        </div>
    );
};

export default APReplyBox;
