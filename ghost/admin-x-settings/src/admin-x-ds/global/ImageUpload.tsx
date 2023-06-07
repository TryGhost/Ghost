import FileUpload from './FileUpload';
import Icon from './Icon';
import React from 'react';

interface ImageUploadProps {
    id: string;
    children?: React.ReactNode;
    width?: string;
    height?: string;
    imageURL?: string;
    unstyled?: boolean;
    imageClassName?: string;
    fileUploadClassName?: string;
    deleteButtonClassName?: string;
    deleteButtonContent?: React.ReactNode;
    onUpload: (file: File) => void;
    onDelete: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    id,
    children,
    width,
    height = '120px',
    imageURL,
    imageClassName,
    fileUploadClassName,
    deleteButtonClassName,
    deleteButtonContent,
    unstyled = false,
    onUpload,
    onDelete
}) => {
    if (!unstyled) {
        imageClassName = imageClassName || 'group relative bg-cover';
        fileUploadClassName = fileUploadClassName || 'flex cursor-pointer items-center justify-center rounded border border-grey-100 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black';
        deleteButtonClassName = deleteButtonClassName || 'invisible absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible';
        deleteButtonContent = deleteButtonContent || <Icon color='white' name='trash' size='sm' />;
    }

    if (imageURL) {
        return (
            <div className={imageClassName} style={{
                width: (unstyled ? '' : width),
                height: (unstyled ? '' : height),
                backgroundImage: `url(${imageURL})`
            }}>
                <button className={deleteButtonClassName} type='button' onClick={onDelete}>
                    {deleteButtonContent}
                </button>
            </div>
        );
    } else {
        return (
            <FileUpload className={fileUploadClassName} id={id} style={
                {
                    width: (unstyled ? '' : width),
                    height: (unstyled ? '' : height)
                }
            } onUpload={onUpload}>
                {children}
            </FileUpload>
        );
    }
};

export default ImageUpload;