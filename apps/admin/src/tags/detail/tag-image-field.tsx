import React from 'react';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Label, LoadingIndicator} from '@tryghost/shade/components';
import {LucideIcon} from '@tryghost/shade/utils';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';
import {toast} from 'sonner';

interface TagImageFieldProps {
    id: string;
    label: string;
    uploadText: string;
    value: string;
    disabled?: boolean;
    onChange: (url: string) => void;
}

/**
 * One image slot on the tag form (tag image, X image, Facebook image),
 * standing in for Ember's `GhImageUploaderWithPreview`: an upload dropzone
 * when empty, a preview with a remove action when set.
 */
const TagImageField: React.FC<TagImageFieldProps> = ({id, label, uploadText, value, disabled, onChange}) => {
    const {mutateAsync: uploadImage, isPending} = useUploadImage();

    const handleUpload = async (file: File) => {
        try {
            const response = await uploadImage({file});
            onChange(getImageUrl(response));
        } catch {
            toast.error('Couldn’t upload the image.');
        }
    };

    return (
        <div className='flex flex-col gap-1.5'>
            <Label htmlFor={id}>{label}</Label>
            <ImageUpload className='h-40'>
                {value ? (
                    <ImageUploadPreview>
                        <ImageUploadImage alt='' src={value} />
                        <ImageUploadActions>
                            <ImageUploadAction aria-label={`Remove ${label.toLowerCase()}`} disabled={disabled} onClick={() => onChange('')}>
                                <LucideIcon.Trash2 />
                            </ImageUploadAction>
                        </ImageUploadActions>
                    </ImageUploadPreview>
                ) : (
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
                )}
            </ImageUpload>
        </div>
    );
};

export default TagImageField;
