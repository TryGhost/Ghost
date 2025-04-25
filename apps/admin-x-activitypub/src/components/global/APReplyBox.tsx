import React, {ChangeEvent, HTMLProps, useEffect, useId, useRef, useState} from 'react';

import * as FormPrimitive from '@radix-ui/react-form';
import APAvatar from './APAvatar';
import clsx from 'clsx';
import getUsername from '../../utils/get-username';
import {ActorProperties, ObjectProperties} from '@tryghost/admin-x-framework/api/activitypub';
import {Button, LucideIcon} from '@tryghost/shade';
import {FILE_SIZE_ERROR_MESSAGE, COVER_MAX_DIMENSIONS as IMAGE_MAX_DIMENSIONS, MAX_FILE_SIZE, checkImageDimensions, getDimensionErrorMessage} from '@utils/image';
import {showToast} from '@tryghost/admin-x-design-system';
import {uploadFile, useReplyMutationForUser, useUserDataForUser} from '@hooks/use-activity-pub-queries';

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
    const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);

    const {data: user} = useUserDataForUser('index');
    const replyMutation = useReplyMutationForUser('index', user);

    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const imageInputRef = useRef<HTMLInputElement>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);
    const [isImageUploading, setIsImageUploading] = useState(false);
    const imageButtonRef = useRef<HTMLButtonElement>(null);

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
            content: textValue,
            imageUrl: uploadedImageUrl || undefined
        }, {
            onError() {
                onReplyError?.();
            }
        });

        setTextValue('');
        setImagePreview(null);
        setUploadedImageUrl(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }
        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }

        onReply?.();
    }

    const [isFocused] = useState(true);

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

    const handleImageUpload = async (file: File) => {
        try {
            setIsImageUploading(true);
            const imageUrl = await uploadFile(file);
            setUploadedImageUrl(imageUrl);
        } catch (err) {
            setImagePreview(null);

            let errorMessage = 'Failed to upload image. Try again.';

            if (err && typeof err === 'object' && 'statusCode' in err) {
                switch (err.statusCode) {
                case 413:
                    errorMessage = 'Image size exceeds limit.';
                    break;
                case 415:
                    errorMessage = 'The file type is not supported.';
                    break;
                default:
                    // Use the default error message
                }
            }
            showToast({
                message: errorMessage,
                type: 'error'
            });
        } finally {
            setIsImageUploading(false);
        }
    };

    const handleImageChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;

        if (files && files.length > 0) {
            const file = files[0];

            if (file.size > MAX_FILE_SIZE) {
                showToast({
                    message: FILE_SIZE_ERROR_MESSAGE,
                    type: 'error'
                });
                e.target.value = '';
                return;
            }

            const withinMaxDimensions = await checkImageDimensions(
                file,
                IMAGE_MAX_DIMENSIONS.width,
                IMAGE_MAX_DIMENSIONS.height
            );
            if (!withinMaxDimensions) {
                showToast({
                    message: getDimensionErrorMessage(
                        IMAGE_MAX_DIMENSIONS.width,
                        IMAGE_MAX_DIMENSIONS.height
                    ),
                    type: 'error'
                });
                return;
            }

            const previewUrl = URL.createObjectURL(file);
            setImagePreview(previewUrl);

            await handleImageUpload(file);
        }
    };

    const handleClearImage = (e: React.MouseEvent) => {
        e.stopPropagation();
        setImagePreview(null);
        setUploadedImageUrl(null);
        if (imagePreview) {
            URL.revokeObjectURL(imagePreview);
        }

        if (imageInputRef.current) {
            imageInputRef.current.value = '';
        }
    };

    useEffect(() => {
        // Cleanup function to revoke object URLs when component unmounts
        return () => {
            if (imagePreview) {
                URL.revokeObjectURL(imagePreview);
            }
        };
    }, [imagePreview]);

    const styles = clsx(
        'ap-textarea order-2 w-full resize-none break-words rounded-lg border bg-transparent py-2 pr-3 text-[1.5rem] transition-all dark:text-white',
        isFocused ? 'min-h-[20px]' : 'min-h-[41px]',
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
                                    onChange={handleChange}
                                    {...props}>
                                </textarea>
                            </FormPrimitive.Control>
                        </FormPrimitive.Field>
                        <FormPrimitive.Field name='image' asChild>
                            <FormPrimitive.Control asChild>
                                <input
                                    ref={imageInputRef}
                                    accept="image/jpeg,image/png,image/webp"
                                    className='hidden'
                                    type="file"
                                    onChange={handleImageChange}
                                />
                            </FormPrimitive.Control>
                        </FormPrimitive.Field>
                        {title}
                        {hint}
                    </div>
                </FormPrimitive.Root>
                {imagePreview &&
                    <div className='group relative -mt-6 w-fit grow'>
                        <img alt='Image attachment preview' className={`max-h-[420px] w-full rounded-sm object-cover outline outline-1 -outline-offset-1 outline-black/10 ${isImageUploading && 'animate-pulse'}`} src={imagePreview} />
                        <Button className='absolute right-3 top-3 size-8 bg-black/60 opacity-0 hover:bg-black/80 group-hover:opacity-100' onClick={handleClearImage}><LucideIcon.Trash2 /></Button>
                    </div>
                }
                <div className={`${imagePreview ? 'mt-4' : 'absolute'} bottom-[3px] right-0 flex justify-end space-x-3 transition-[opacity] duration-150`}>
                    <Button ref={imageButtonRef} className='w-[34px] !min-w-0' variant='outline' onClick={() => imageInputRef.current?.click()}><LucideIcon.Image /></Button>
                    <Button className='min-w-20' color='black' disabled={buttonDisabled || isImageUploading} id='post' onClick={handleClick}>Post</Button>
                </div>
            </div>
        </div>
    );
};

export default APReplyBox;
