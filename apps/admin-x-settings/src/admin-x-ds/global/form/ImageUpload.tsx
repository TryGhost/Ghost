import FileUpload from './FileUpload';
import Icon from '../Icon';
import React, {MouseEventHandler} from 'react';
import clsx from 'clsx';

type ImageFit = 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';

interface ImageUploadProps {
    id: string;
    children?: React.ReactNode;
    width?: string;
    height?: string;
    imageURL?: string;
    imageFit?: ImageFit;
    imageContainerClassName?: string;
    imageClassName?: string;
    imageBWCheckedBg?: boolean;
    fileUploadClassName?: string;
    deleteButtonClassName?: string;
    deleteButtonContent?: React.ReactNode;
    deleteButtonUnstyled?: boolean;

    /**
     * Removes all the classnames from all elements so you can set a completely custom styling
     */
    unstyled?: boolean;
    onUpload: (file: File) => void;
    onDelete: () => void;
    onImageClick?: MouseEventHandler<HTMLImageElement>;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
    id,
    children,
    width = '100%',
    height = '120px',
    imageURL,
    imageFit = 'cover',
    imageContainerClassName,
    imageClassName,
    fileUploadClassName,
    deleteButtonClassName,
    deleteButtonContent,
    deleteButtonUnstyled = false,
    imageBWCheckedBg = false,
    unstyled = false,
    onUpload,
    onDelete,
    onImageClick
}) => {
    if (!unstyled) {
        imageContainerClassName = clsx(
            'group relative flex justify-center',
            imageContainerClassName
        );

        imageClassName = clsx(
            imageFit === 'cover' && 'object-cover',
            imageFit === 'contain' && 'object-contain',
            imageFit === 'fill' && 'object-fill',
            imageFit === 'scale-down' && 'object-scale-down',
            imageFit === 'none' && 'object-scale-down',
            imageClassName
        );

        fileUploadClassName = clsx(
            'flex cursor-pointer items-center justify-center rounded border border-grey-100 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black',
            fileUploadClassName

        );

        if (!deleteButtonUnstyled) {
            deleteButtonClassName = clsx(
                'invisible absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible',
                deleteButtonClassName
            );
        }
    }

    deleteButtonContent = deleteButtonContent || <Icon colorClass='text-white' name='trash' size='sm' />;

    if (imageURL) {
        let image = (
            <div className={imageContainerClassName} style={{
                width: (unstyled ? '' : width),
                height: (unstyled ? '' : height)
            }}>
                <img alt='' className={imageClassName} id={id} src={imageURL} style={{
                    width: (unstyled ? '' : width || '100%'),
                    height: (unstyled ? '' : height || 'auto')
                }} onClick={onImageClick} />
                <button className={deleteButtonClassName} type='button' onClick={onDelete}>
                    {deleteButtonContent}
                </button>
            </div>
        );

        if (imageBWCheckedBg) {
            const dark = '#ddd';
            const light = '#f9f9f9';
            image = (
                <div style={{
                    backgroundImage: `
                        linear-gradient(45deg, ${dark} 25%, transparent 25%),
                        linear-gradient(45deg, transparent 75%, ${dark} 75%),
                        linear-gradient(45deg, transparent 75%, ${dark} 75%),
                        linear-gradient(45deg, ${dark} 25%, ${light} 25%)
                    `,
                    backgroundSize: '32px 32px',
                    backgroundPosition: '0 0, 0 0, -16px -16px, 16px 16px'
                }}>
                    {image}
                </div>
            );
        }

        return image;
    } else {
        return (
            <FileUpload className={fileUploadClassName} id={id} style={
                {
                    width: (unstyled ? '' : width),
                    height: (unstyled ? '' : height)
                }
            } unstyled={unstyled} onUpload={onUpload}>
                <span>{children}</span>
            </FileUpload>
        );
    }
};

export default ImageUpload;
