import * as React from 'react';
import {cva, type VariantProps} from 'class-variance-authority';

import {Button, type ButtonProps} from '@/components/ui/button';
import {Dropzone, type DropzoneProps} from '@/components/ui/dropzone';
import {cn} from '@/lib/utils';

const ImageUpload = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn('relative overflow-hidden rounded-md', className)}
            data-slot='image-upload'
            {...props}
        />
    )
);
ImageUpload.displayName = 'ImageUpload';

const ImageUploadDropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(
    ({className, variant = 'filled', ...props}, ref) => (
        <Dropzone
            ref={ref}
            className={cn('size-full text-foreground', className)}
            data-slot='image-upload-dropzone'
            variant={variant}
            {...props}
        />
    )
);
ImageUploadDropzone.displayName = 'ImageUploadDropzone';

const imageUploadPreviewVariants = cva(
    'group relative flex size-full items-center justify-center overflow-hidden rounded-md bg-muted',
    {
        variants: {
            background: {
                default: '',
                checkerboard: '[background-image:repeating-conic-gradient(var(--border-default)_0%_25%,var(--surface-elevated)_0%_50%)] [background-size:16px_16px]'
            }
        },
        defaultVariants: {
            background: 'default'
        }
    }
);

export interface ImageUploadPreviewProps extends React.HTMLAttributes<HTMLDivElement>, VariantProps<typeof imageUploadPreviewVariants> {}

const ImageUploadPreview = React.forwardRef<HTMLDivElement, ImageUploadPreviewProps>(
    ({background, className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn(imageUploadPreviewVariants({background}), className)}
            data-slot='image-upload-preview'
            data-testid='image-upload-container'
            {...props}
        />
    )
);
ImageUploadPreview.displayName = 'ImageUploadPreview';

const ImageUploadImage = React.forwardRef<HTMLImageElement, React.ImgHTMLAttributes<HTMLImageElement>>(
    ({alt = '', className, ...props}, ref) => (
        <img
            ref={ref}
            alt={alt}
            className={cn('size-full object-cover', className)}
            data-slot='image-upload-image'
            {...props}
        />
    )
);
ImageUploadImage.displayName = 'ImageUploadImage';

const ImageUploadActions = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
    ({className, ...props}, ref) => (
        <div
            ref={ref}
            className={cn('absolute top-2 right-2 flex gap-1 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100', className)}
            data-slot='image-upload-actions'
            {...props}
        />
    )
);
ImageUploadActions.displayName = 'ImageUploadActions';

const ImageUploadAction = React.forwardRef<HTMLButtonElement, ButtonProps>(
    ({className, size = 'icon', variant = 'ghost', ...props}, ref) => (
        <Button
            ref={ref}
            className={cn('size-8 bg-surface-inverse text-surface-inverse-foreground hover:bg-surface-inverse/90 hover:text-surface-inverse-foreground', className)}
            data-slot='image-upload-action'
            size={size}
            variant={variant}
            {...props}
        />
    )
);
ImageUploadAction.displayName = 'ImageUploadAction';

export {
    ImageUpload,
    ImageUploadAction,
    ImageUploadActions,
    ImageUploadDropzone,
    ImageUploadImage,
    ImageUploadPreview,
    imageUploadPreviewVariants
};
