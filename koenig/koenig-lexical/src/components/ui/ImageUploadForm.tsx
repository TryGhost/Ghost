import React from 'react';

interface ImageUploadFormProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.Ref<HTMLInputElement>;
    filePicker?: () => void;
    mimeTypes?: string[];
    multiple?: boolean;
    disabled?: boolean;
}

export function ImageUploadForm({onFileChange, fileInputRef, mimeTypes = ['image/*'], multiple = false, disabled}: ImageUploadFormProps) {
    const accept = mimeTypes.join(',');

    return (
        <form onChange={onFileChange as unknown as React.FormEventHandler<HTMLFormElement>}>
            <input
                ref={fileInputRef}
                accept={accept}
                disabled={disabled}
                hidden={true}
                multiple={multiple}
                name="image-input"
                type='file'
                onClick={e => e.stopPropagation()}
            />
        </form>
    );
}

export default ImageUploadForm;
