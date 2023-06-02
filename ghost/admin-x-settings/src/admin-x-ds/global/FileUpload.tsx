import React, {ChangeEvent} from 'react';

export interface FileUploadProps {
    id: string;

    /**
     * Can be any component that has no default onClick eventh handline. E.g. buttons and links won't work
     */
    children?: React.ReactNode;
    className?: string;
    onUpload: (file: File) => void;
    style?: {}
}

const FileUpload: React.FC<FileUploadProps> = ({id, onUpload, children, style, ...props}) => {
    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            onUpload?.(selectedFile);
        }
    };

    return (
        <label htmlFor={id} style={style} {...props}>
            <input id={id} type="file" hidden onChange={handleFileChange} />
            {children}
        </label>
    );
};

export default FileUpload;