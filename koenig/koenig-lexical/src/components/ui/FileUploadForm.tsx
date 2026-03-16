import React from 'react';

interface FileUploadFormProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.Ref<HTMLInputElement>;
    setFileInputRef?: (ref: React.RefObject<HTMLInputElement | null>) => void;
}

export function FileUploadForm({onFileChange, fileInputRef}: FileUploadFormProps) {
    return (
        <form>
            <input
                ref={fileInputRef}
                hidden={true}
                name="file-input"
                type='file'
                onChange={onFileChange}
            />
        </form>
    );
}

export default FileUploadForm;
