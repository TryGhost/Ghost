import React, {CSSProperties, ChangeEvent, useState} from 'react';

export interface FileUploadProps {
    id: string;

    /**
     * Can be string or any component that has no default onClick eventh handline.
     * E.g. buttons and links won't work. If it's text then it's styled as the
     * default button.
     */
    children?: string | React.ReactNode;
    className?: string;
    onUpload: (file: File) => void;
    style?: CSSProperties;
    unstyled?: boolean;
    inputRef?: React.RefObject<HTMLInputElement>;
}

const FileUpload: React.FC<FileUploadProps> = ({id, onUpload, children, style, unstyled = false, inputRef, ...props}) => {
    const [fileKey, setFileKey] = useState<number>(Date.now());

    const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
        const selectedFile = event.target.files?.[0];
        if (selectedFile) {
            onUpload?.(selectedFile);
        }
        setFileKey(Date.now());
    };

    return (
        <label htmlFor={id} style={style} {...props}>
            <input key={fileKey} ref={inputRef || null} id={id} type="file" hidden onChange={handleFileChange} />
            {(typeof children === 'string') ?
                <div className={!unstyled ? `inline-flex h-[34px] cursor-pointer items-center justify-center rounded px-4 text-sm font-semibold hover:bg-grey-100 dark:text-white dark:hover:bg-grey-900` : ''}>
                    {children}
                </div>
                :
                children}
        </label>
    );
};

export default FileUpload;
