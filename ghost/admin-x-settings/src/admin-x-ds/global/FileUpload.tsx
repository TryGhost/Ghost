import React, {useCallback, useEffect} from 'react';
import {ChangeEvent, useState} from 'react';

export interface FileUploadProps {
    id: string;

    /**
     * Can be any component that has no default onClick eventh handline. E.g. buttons and links won't work
     */
    children?: React.ReactNode;
    onUpload: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({id, onUpload, children, ...props}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleFileUpload = useCallback(() => {
        if (selectedFile) {
            onUpload?.(selectedFile);
        }
    }, [onUpload, selectedFile]);

    useEffect(() => {
        handleFileUpload();
    }, [handleFileUpload]);

    return (
        <label htmlFor={id} {...props}>
            <input id={id} type="file" hidden onChange={handleFileChange} />
            {children}
        </label>
    );
};

export default FileUpload;