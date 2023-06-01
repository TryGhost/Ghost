import Button from './Button';
import React from 'react';
import {ChangeEvent, useState} from 'react';

export interface FileUploadProps {
    onUpload: (file: File) => void;
}

const FileUpload: React.FC<FileUploadProps> = ({onUpload}) => {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        if (event.target.files && event.target.files.length > 0) {
            setSelectedFile(event.target.files[0]);
        }
    };

    const handleFileUpload = () => {
        if (selectedFile) {
            onUpload?.(selectedFile);
        }
    };

    return (
        <div>
            <input type="file" onChange={handleFileChange} />
            <Button
                className='mt-2'
                color='green'
                label='Upload'
                onClick={handleFileUpload}
            />
        </div>
    );
};

export default FileUpload;