import React from 'react';
import {Dropzone} from '@tryghost/shade';
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
        <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium">Header image</label>
            {value ? (
                <div className="relative overflow-hidden rounded-md border border-gray-200 dark:border-gray-800">
                    <img
                        alt="Header"
                        className="h-auto w-full"
                        src={value}
                    />
                    <button
                        className="absolute top-2 right-2 rounded bg-black/50 px-2 py-1 text-xs text-white hover:bg-black/70"
                        type="button"
                        onClick={() => onChange('')}
                    >
                        Remove
                    </button>
                </div>
            ) : (
                <>
                    <Dropzone
                        accept={{'image/*': ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']}}
                        className="flex h-24 items-center justify-center p-0 text-sm"
                        onDropAccepted={files => files[0] && handleUpload(files[0])}
                    >
                        <span className="text-gray-700">Upload header image</span>
                    </Dropzone>
                    <span className="text-xs text-muted-foreground">1200x600 recommended. Use a transparent PNG for best results on any background.</span>
                </>
            )}
        </div>
    );
};

export default HeaderImageField;
