import React from 'react';
import {Field, FieldDescription, FieldLabel} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Trash2} from 'lucide-react';
import {formatNumber} from '@tryghost/shade/utils';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';

interface HeaderImageFieldProps {
    inputId?: string;
    onUploadError?: (error: unknown) => void;
    value: string;
    onChange: (url: string) => void;
}

const HeaderImageField: React.FC<HeaderImageFieldProps> = ({inputId = 'welcome-email-header-image', onUploadError, value, onChange}) => {
    const {mutateAsync: uploadImage} = useUploadImage();

    const handleUpload = async (file: File) => {
        try {
            const imageUrl = getImageUrl(await uploadImage({file}));
            onChange(imageUrl);
        } catch (error) {
            if (onUploadError) {
                onUploadError(error);
                return;
            }

            throw error;
        }
    };

    return (
        <Field data-testid="header-image-field">
            <FieldLabel htmlFor={inputId}>Header image</FieldLabel>
            <ImageUpload className='aspect-[2/1] w-full'>
                {value ? (
                    <ImageUploadPreview>
                        <ImageUploadImage alt="Header" src={value} />
                        <ImageUploadActions>
                            <ImageUploadAction aria-label='Remove header image' type='button' onClick={() => onChange('')}>
                                <Trash2 />
                            </ImageUploadAction>
                        </ImageUploadActions>
                    </ImageUploadPreview>
                ) : (
                    <ImageUploadDropzone
                        accept={{'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']}}
                        inputId={inputId}
                        onDropAccepted={files => files[0] && void handleUpload(files[0])}
                    >
                        <span className="text-control font-medium">Upload header image</span>
                    </ImageUploadDropzone>
                )}
            </ImageUpload>
            <FieldDescription>{formatNumber(1200)}×{formatNumber(600)} recommended. Use a transparent PNG for best results on any background.</FieldDescription>
        </Field>
    );
};

export default HeaderImageField;
