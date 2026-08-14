import React from 'react';
import {Field, FieldDescription, FieldLabel} from '@tryghost/shade/components';
import {ImageUpload, ImageUploadAction, ImageUploadActions, ImageUploadDropzone, ImageUploadImage, ImageUploadPreview} from '@tryghost/shade/patterns';
import {Trash2} from 'lucide-react';
import {formatNumber} from '@tryghost/shade/utils';
import {getImageUrl, useUploadImage} from '@tryghost/admin-x-framework/api/images';

interface HeaderImageFieldProps {
    value: string;
    onChange: (url: string) => void;
}

const HeaderImageField: React.FC<HeaderImageFieldProps> = ({value, onChange}) => {
    const {mutateAsync: uploadImage} = useUploadImage();

    const handleUpload = async (file: File) => {
        const imageUrl = getImageUrl(await uploadImage({file}));
        onChange(imageUrl);
    };

    return (
        <Field data-testid="header-image-field">
            <FieldLabel htmlFor='welcome-email-header-image'>Header image</FieldLabel>
            <ImageUpload className='h-24 w-full'>
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
                        inputId="welcome-email-header-image"
                        onDropAccepted={files => files[0] && handleUpload(files[0])}
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
