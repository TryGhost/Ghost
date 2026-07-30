import React from 'react';
import {UnsplashSearchModal} from '@tryghost/kg-unsplash-selector';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Label, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {Stack} from '@tryghost/shade/primitives';
import {createPortal} from 'react-dom';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {useFramework} from '@tryghost/admin-x-framework';
import {usePinturaEditor} from '@/hooks/use-pintura-editor';
import {toast} from 'sonner';

interface TagImageFieldProps {
    id: string;
    label: string;
    uploadText: string;
    value: string;
    disabled?: boolean;
    unsplashEnabled?: boolean;
    onChange: (url: string) => void;
}

/**
 * One image slot on the tag form (tag image, X image, Facebook image),
 * standing in for Ember's `GhImageUploaderWithPreview`: an upload dropzone
 * when empty, a preview with edit/remove actions when set.
 */
const TagImageField: React.FC<TagImageFieldProps> = ({id, label, uploadText, value, disabled, unsplashEnabled, onChange}) => {
    const {mutateAsync: uploadImage, isPending} = useUploadImage();
    const {unsplashConfig} = useFramework();
    const editor = usePinturaEditor({disabled});
    const [showUnsplash, setShowUnsplash] = React.useState(false);

    const handleUpload = async (file: File) => {
        try {
            const response = await uploadImage({file});
            onChange(getImageUrl(response));
        } catch {
            toast.error('Couldn’t upload the image.');
        }
    };

    return (
        <Stack gap='sm'>
            <Label htmlFor={id}>{label}</Label>
            <ImageUpload className='h-40'>
                {value ? (
                    <ImageUploadPreview>
                        <ImageUploadImage alt='' src={value} />
                        <ImageUploadActions>
                            {editor.isEnabled && (
                                <ImageUploadAction aria-label={`Edit ${label.toLowerCase()}`} disabled={disabled} onClick={() => editor.openEditor({image: value, handleSave: handleUpload})}>
                                    <LucideIcon.Pencil />
                                </ImageUploadAction>
                            )}
                            <ImageUploadAction aria-label={`Remove ${label.toLowerCase()}`} disabled={disabled} onClick={() => onChange('')}>
                                <LucideIcon.Trash2 />
                            </ImageUploadAction>
                        </ImageUploadActions>
                    </ImageUploadPreview>
                ) : (
                    <>
                        <ImageUploadDropzone
                            accept={{'image/*': []}}
                            disabled={disabled || isPending}
                            inputAriaLabel={uploadText}
                            inputId={id}
                            onDropAccepted={(files) => {
                                if (files[0]) {
                                    void handleUpload(files[0]);
                                }
                            }}
                            onDropRejected={() => toast.error('The image type you uploaded is not supported. Please use .GIF, .JPG, .JPEG, .PNG, .SVG, .SVGZ, .WEBP')}
                        >
                            {isPending ? (
                                <LoadingIndicator size='sm' />
                            ) : (
                                <span className='text-sm text-muted-foreground'>{uploadText}</span>
                            )}
                        </ImageUploadDropzone>
                        {unsplashEnabled && (
                            <ImageUploadActions className='top-1 right-1 opacity-100'>
                                <ImageUploadAction aria-label={`Select ${label.toLowerCase()} from Unsplash`} disabled={disabled} onClick={() => setShowUnsplash(true)}>
                                    <LucideIcon.Images />
                                </ImageUploadAction>
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
