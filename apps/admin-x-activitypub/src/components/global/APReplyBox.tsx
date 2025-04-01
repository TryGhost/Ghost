import React, {HTMLProps, useEffect, useId, useRef, useState} from 'react';

import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from './APAvatar';
import clsx from 'clsx';
import getUsername from '../../utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button} from '@tryghost/admin-x-design-system';
import {useReplyMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';

export interface APTextAreaProps extends HTMLProps<HTMLTextAreaElement> {
    title?: string;
    value?: string;
    rows?: number;
    error?: boolean;
    placeholder?: string;
    hint?: React.ReactNode;
    className?: string;
    onChange?: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
    onReply?: () => void;
    onReplyError?: () => void;
    object: ObjectProperties;
    focused: number;
}

export const useFocusedState = (initialValue: boolean) => {
    const [state, setUnderlyingState] = useState(initialValue ? 1 : 0);

    const setState = (value: boolean | ((prev: number) => number)) => {
        if (value === false) {
            return setUnderlyingState(0);
        }
        setUnderlyingState((prev) => {
            return prev + 1;
        });
    };

    return [state, setState] as const;
};

const adjustTextareaHeight = (textarea: HTMLTextAreaElement) => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 2}px`;
};

const APReplyBox: React.FC<APTextAreaProps> = ({
    title,
    value,
    rows = 1,
    maxLength,
    error,
    hint,
    className,
    object,
    focused,
    onReply,
    onReplyError,
    ...props
}) => {
    const id = useId();
    const [textValue, setTextValue] = useState(value); // Manage the textarea value with state

    const {data: user} = useUserDataForUser('index');
    const replyMutation = useReplyMutationForUser('index', user);

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        if (textareaRef.current && focused) {
            textareaRef.current.focus();
        }
    }, [focused]);

    async function handleClick() {
        if (!textValue || !user) {
            return;
        }

        replyMutation.mutate({
            inReplyTo: object.id,
            content: textValue
        }, {
            onError() {
                onReplyError?.();
            }
        });

        setTextValue('');

        onReply?.();
    }

    const [isFocused, setFocused] = useState(false);

    useEffect(() => {
        if (textareaRef.current) {
            adjustTextareaHeight(textareaRef.current);
        }
    }, [textValue]);

    function handleChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
        setTextValue(event.target.value);
        if (event.target) {
            adjustTextareaHeight(event.target);
        }
    }

    function handleBlur() {
        setFocused(false);
        if (textareaRef.current && !textValue?.trim()) {
            textareaRef.current.style.height = '';
        }
    }

    function handleFocus() {
        setFocused(true);
    }

    const styles = clsx(
        'ap-textarea order-2 w-full resize-none break-words rounded-lg border bg-transparent py-2 pr-3 text-[1.5rem] transition-all dark:text-white',
        isFocused ? 'min-h-[80px]' : 'min-h-[41px]',
        (textValue || isFocused) && 'mb-10',
        error ? 'border-red' : 'border-transparent placeholder:text-gray-500 dark:placeholder:text-gray-800',
        title && 'mt-1.5',
        className
    );

    const buttonDisabled = !textValue || !user;

    let placeholder = 'Reply...';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attributedTo = (object.attributedTo || {}) as any;
    if (typeof attributedTo.preferredUsername === 'string' && typeof attributedTo.id === 'string') {
        placeholder = `Reply to ${getUsername(attributedTo)}...`;
    }

    return (
        <div className='flex w-full gap-x-3 py-6'>
            <APAvatar author={user as ActorProperties} />
            <div className='relative w-full'>
                <FormPrimitive.Root asChild>
                    <div className='flex w-full flex-col'>
                        <FormPrimitive.Field name={id} asChild>
                            <FormPrimitive.Control asChild>
                                <textarea
                                    ref={textareaRef}
                                    className={styles}
                                    id={id}
                                    maxLength={maxLength}
                                    placeholder={placeholder}
                                    rows={rows}
                                    value={textValue}
                                    onBlur={handleBlur}
                                    onChange={handleChange}
                                    onFocus={handleFocus}
                                    {...props}>
                                </textarea>
                            </FormPrimitive.Control>
                        </FormPrimitive.Field>
                        {title}
                        {hint}
                    </div>
                </FormPrimitive.Root>
                <div className='absolute bottom-[3px] right-0 flex space-x-4 transition-[opacity] duration-150'>
                    <Button color='black' disabled={buttonDisabled} id='post' label='Post' size='md' onMouseDown={handleClick} />
                </div>
            </div>
        </div>
    );
};

export default APReplyBox;
