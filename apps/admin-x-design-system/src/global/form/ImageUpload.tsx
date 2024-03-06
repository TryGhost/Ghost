import clsx from 'clsx';
import React, {MouseEventHandler} from 'react';
import Icon from '../Icon';
import FileUpload, {FileUploadProps} from './FileUpload';

type ImageFit = 'cover' | 'contain' | 'fill' | 'scale-down' | 'none';

export interface ImageUploadProps {
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
    fileUploadProps?: Partial<FileUploadProps>;
    deleteButtonClassName?: string;
    deleteButtonContent?: React.ReactNode;
    deleteButtonUnstyled?: boolean;
    editButtonClassName?: string;
    editButtonContent?: React.ReactNode;
    editButtonUnstyled?: boolean;
    buttonContainerClassName?: string;
    unsplashButtonClassName?: string;
    unsplashButtonUnstyled?: boolean;
    unsplashButtonContent?: React.ReactNode;

    /**
     * Removes all the classnames from all elements so you can set a completely custom styling
     */
    unstyled?: boolean;
    onUpload: (file: File) => void;
    onDelete: () => void;
    onImageClick?: MouseEventHandler<HTMLImageElement>;

    /**
     * Pintura config
     */
    pintura?: {
        isEnabled: boolean;
        openEditor: () => void;
    };

    unsplashEnabled?: boolean;
    openUnsplash?: () => void;
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
    fileUploadProps,
    deleteButtonClassName,
    deleteButtonContent,
    deleteButtonUnstyled = false,
    imageBWCheckedBg = false,
    unstyled = false,
    onUpload,
    onDelete,
    onImageClick,
    pintura,
    editButtonClassName,
    editButtonContent,
    editButtonUnstyled = false,
    buttonContainerClassName,
    unsplashButtonClassName,
    unsplashButtonUnstyled = false,
    unsplashButtonContent,
    unsplashEnabled,
    openUnsplash
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
            'flex cursor-pointer items-center justify-center rounded border border-grey-100 bg-grey-75 p-3 text-sm font-semibold text-grey-800 hover:text-black dark:border-grey-900 dark:bg-grey-900 dark:text-grey-400',
            fileUploadClassName

        );

        if (!deleteButtonUnstyled) {
            deleteButtonClassName = clsx(
                'absolute right-4 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible md:invisible',
                deleteButtonClassName
            );
        }

        if (!editButtonUnstyled) {
            editButtonClassName = clsx(
                'absolute right-16 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[rgba(0,0,0,0.75)] text-white hover:bg-black group-hover:!visible md:invisible',
                editButtonClassName
            );
        }

        if (!unsplashButtonUnstyled) {
            unsplashButtonClassName = clsx(
                'absolute right-16 top-4 flex h-8 w-8 cursor-pointer items-center justify-center rounded bg-[rgba(255,255,255)] text-white',
                unsplashButtonClassName
            );
        }
    }

    deleteButtonContent = deleteButtonContent || <Icon colorClass='text-white' name='trash' size='sm' />;
    editButtonContent = editButtonContent || <Icon colorClass='text-white' name='pen' size='sm' />;
    unsplashButtonContent = unsplashButtonContent || <Icon colorClass='text-black' name='unsplash-logo' size='sm' />;

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
                <div className={buttonContainerClassName}>
                    {
                        pintura?.isEnabled && pintura?.openEditor &&
                    <button className={editButtonClassName} type='button' onClick={pintura.openEditor}>
                        {editButtonContent}
                    </button>
                    }
                    <button className={deleteButtonClassName} type='button' onClick={onDelete}>
                        {deleteButtonContent}
                    </button>
                </div>
            </div>
        );

        if (imageBWCheckedBg) {
            const dark = '#d9d9d9';
            const light = '#f1f1f1';
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
            <div className={`${buttonContainerClassName} ${unsplashEnabled ? 'relative' : ''}`}>
                {
                    unsplashEnabled &&
                        <button className={unsplashButtonClassName} data-testid="toggle-unsplash-button" type='button' onClick={openUnsplash}>
                            {unsplashButtonContent}
                        </button>
                }
                <FileUpload className={fileUploadClassName} id={id} style={
                    {
                        width: (unstyled ? '' : width),
                        height: (unstyled ? '' : height)
                    }
                } unstyled={unstyled} onUpload={onUpload} {...fileUploadProps}>
                    <>
                        <span className='text-center'>{children}</span>
                    </>
                </FileUpload>
            </div>
        );
    }
};

export default ImageUpload;
