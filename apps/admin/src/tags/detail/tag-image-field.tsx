import React from 'react';
import {UnsplashSearchModal} from '@tryghost/kg-unsplash-selector';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Button, Label, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {Stack} from '@tryghost/shade/primitives';
import {createPortal} from 'react-dom';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useFramework} from '@tryghost/admin-x-framework';
import {usePinturaEditor} from '@/hooks/use-pintura-editor';
import BrandIcon from '@/settings/components/icons/brand-icon';
import {JSONError, RequestEntityTooLargeError, UnsupportedMediaTypeError} from '@tryghost/admin-x-framework/errors';
import {toast} from 'sonner';

const ACCEPTED_IMAGE_TYPES = {
    'image/gif': ['.gif'],
    'image/jpeg': ['.jpg', '.jpeg'],
    'image/png': ['.png'],
    'image/svg+xml': ['.svg', '.svgz'],
    'image/webp': ['.webp']
};

const UNSUPPORTED_IMAGE_MESSAGE = 'The image type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP';

interface TagImageFieldProps {
    id: string;
    label: string;
    uploadText: string;
    value: string;
    disabled?: boolean;
    unsplashEnabled?: boolean;
    onChange: (url: string) => void;
    onBusyChange?: (busy: boolean) => void;
    onUploadPendingChange?: (pending: boolean) => void;
}

/**
 * One image slot on the tag form (tag image, X image, Facebook image),
 * standing in for Ember's `GhImageUploaderWithPreview`: an upload dropzone
 * when empty, a preview with edit/remove actions when set.
 */
const TagImageField: React.FC<TagImageFieldProps> = ({id, label, uploadText, value, disabled, unsplashEnabled, onChange, onBusyChange, onUploadPendingChange}) => {
    const {mutateAsync: uploadImage, isPending} = useUploadImage();
    const {unsplashConfig} = useFramework();
    const editor = usePinturaEditor({disabled});
    const [showUnsplash, setShowUnsplash] = React.useState(false);
    const [operationPending, setOperationPending] = React.useState(false);
    const mountedRef = React.useRef(true);
    const operationPendingRef = React.useRef(false);
    const onBusyChangeRef = React.useRef(onBusyChange);
    onBusyChangeRef.current = onBusyChange;
    const onUploadPendingChangeRef = React.useRef(onUploadPendingChange);
    onUploadPendingChangeRef.current = onUploadPendingChange;

    React.useEffect(() => {
        mountedRef.current = true;
        return () => {
            mountedRef.current = false;
            onBusyChangeRef.current?.(false);
            onUploadPendingChangeRef.current?.(false);
        };
    }, []);

    const isBusy = operationPending || showUnsplash || editor.isOpen;
    React.useEffect(() => {
        onBusyChangeRef.current?.(isBusy);
    }, [isBusy]);

    React.useEffect(() => {
        onUploadPendingChangeRef.current?.(operationPending);
    }, [operationPending]);

    React.useEffect(() => {
        if (isPending) {
            setShowUnsplash(false);
        }
    }, [isPending]);

    const handleUpload = async (file: File) => {
        if (operationPendingRef.current) {
            return false;
        }
        operationPendingRef.current = true;
        setOperationPending(true);
        try {
            const response = await uploadImage({file});
            if (mountedRef.current) {
                onChange(getImageUrl(response));
            }
            return true;
        } catch (error) {
            let message = 'Couldn’t upload the image.';
            if (error instanceof UnsupportedMediaTypeError) {
                message = UNSUPPORTED_IMAGE_MESSAGE;
            } else if (error instanceof RequestEntityTooLargeError) {
                message = 'The image you uploaded was larger than the maximum file size your server allows.';
            } else if (error instanceof JSONError && error.data?.errors[0]?.message) {
                message = error.data.errors[0].message;
            }
            if (mountedRef.current) {
                toast.error(message);
            }
            return false;
        } finally {
            operationPendingRef.current = false;
            if (mountedRef.current) {
                setOperationPending(false);
            }
        }
    };

    const fieldDisabled = disabled || operationPending || isPending;

    return (
        <Stack gap='sm'>
            <Label htmlFor={id}>{label}</Label>
            <ImageUpload className='h-40'>
                {value ? (
                    <ImageUploadPreview>
                        <ImageUploadImage alt='' src={value} />
                        <ImageUploadActions>
                            {editor.isEnabled && (
                                <ImageUploadAction aria-label={`Edit ${label.toLowerCase()}`} disabled={fieldDisabled} onClick={() => editor.openEditor({image: value, handleSave: handleUpload})}>
                                    <LucideIcon.Pencil />
                                </ImageUploadAction>
                            )}
                            <ImageUploadAction aria-label={`Remove ${label.toLowerCase()}`} disabled={fieldDisabled} onClick={() => onChange('')}>
                                <LucideIcon.Trash2 />
                            </ImageUploadAction>
                        </ImageUploadActions>
                    </ImageUploadPreview>
                ) : (
                    <>
                        <ImageUploadDropzone
                            accept={ACCEPTED_IMAGE_TYPES}
                            className='group/dropzone transition-colors hover:bg-interactive-hover'
                            disabled={fieldDisabled}
                            inputAriaLabel={uploadText}
                            inputId={id}
                            onDropAccepted={(files) => {
                                if (files[0]) {
                                    void handleUpload(files[0]);
                                }
                            }}
                            onDropRejected={() => toast.error(UNSUPPORTED_IMAGE_MESSAGE)}
                        >
                            {isPending ? (
                                <LoadingIndicator size='sm' />
                            ) : (
                                <Stack align='center' gap='sm'>
                                    <LucideIcon.Upload aria-hidden='true' className='size-6 stroke-[1.5px] text-muted-foreground transition-colors group-hover/dropzone:text-foreground' />
                                    <span className='text-sm text-muted-foreground transition-colors group-hover/dropzone:text-foreground'>{uploadText}</span>
                                </Stack>
                            )}
                        </ImageUploadDropzone>
                        {unsplashEnabled && (
                            <ImageUploadActions className='top-1 right-1 opacity-100'>
                                <Button aria-label={`Select ${label.toLowerCase()} from Unsplash`} className='group/unsplash hover:bg-button-hover' disabled={fieldDisabled} size='icon' type='button' variant='ghost' onClick={() => setShowUnsplash(true)}>
                                    <BrandIcon className='size-4 text-muted-foreground transition-colors group-hover/unsplash:text-foreground' name='unsplash' />
                                </Button>
                            </ImageUploadActions>
                        )}
                    </>
                )}
            </ImageUpload>
            {showUnsplash && createPortal(
                <UnsplashSearchModal
                    unsplashProviderConfig={unsplashConfig}
                    onClose={() => setShowUnsplash(false)}
                    onImageInsert={(image) => {
                        if (image.src) {
                            onChange(image.src);
                        }
                        setShowUnsplash(false);
                    }}
                />,
                document.body
            )}
        </Stack>
    );
};

export default TagImageField;
