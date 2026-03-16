import React from 'react';

interface AudioUploadFormProps {
    onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    fileInputRef: React.Ref<HTMLInputElement>;
    filePicker?: () => void;
    mimeTypes?: string[];
}

export function AudioUploadForm({onFileChange, fileInputRef, mimeTypes = ['audio/*']}: AudioUploadFormProps) {
    return (
        <form>
            <input
                ref={fileInputRef}
                accept={mimeTypes.join(',')}
                hidden={true}
                name="audio-input"
                type='file'
                onChange={onFileChange}
            />
        </form>
    );
}

export default AudioUploadForm;
