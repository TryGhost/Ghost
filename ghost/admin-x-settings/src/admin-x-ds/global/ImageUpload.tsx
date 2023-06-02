import FileUpload from './FileUpload';
import Icon from './Icon';
import React from 'react';

interface ImageUploadProps {
    id: string;
    label: React.ReactNode;
    width?: string;
    height?: string;
    imageURL?: string;
    onUpload: (file: File) => void;
    onDelete: () => void;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    id,
    label,
    width,
    height = '120px',
    imageURL,
    onUpload,
    onDelete
}) => {
    if (imageURL) {
        return (
            <div className='group relative bg-cover' style={{
                width: width,
                height: height,
                backgroundImage: `url(${imageURL})`
            }}>
                <button className='invisible absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible' type='button' onClick={onDelete}>
                    <Icon color='white' name='trash' size='sm' />
                </button>
            </div>
        );
    } else {
        return (
            <FileUpload className={`flex cursor-pointer items-center justify-center rounded border border-grey-100 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black`} id={id} style={
                {
                    width: width,
                    height: height
                }
            } onUpload={onUpload}>
                {label}
            </FileUpload>
        );
    }
};

export default ImageUpload;