import * as React from 'react';
import {Accept, DropEvent, FileRejection, useDropzone} from 'react-dropzone';
import {cva, type VariantProps} from 'class-variance-authority';
import {buttonVariants} from '@/components/ui/button';
import {inputSurface} from '@/components/ui/input-surface';
import {cn} from '@/lib/utils';

const dropzoneVariants = cva(
    'flex cursor-pointer flex-col items-center justify-center outline-hidden',
    {
        variants: {
            variant: {
                default: cn(inputSurface('self'), 'border-2 border-dashed bg-transparent p-10 hover:border-border-strong'),
                filled: cn(inputSurface('self'), 'border-transparent bg-muted p-3 hover:bg-interactive-hover'),
                button: cn(buttonVariants({variant: 'outline'}), 'flex-row'),
                buttonSecondary: cn(buttonVariants({size: 'sm', variant: 'secondary'}), 'flex-row')
            }
        },
        defaultVariants: {
            variant: 'default'
        }
    }
);

type DropzoneRenderProps = {
    isDragActive: boolean;
    isDragAccept: boolean;
    isDragReject: boolean;
    isFocused: boolean;
    isFileDialogActive: boolean;
    open: () => void;
};

export interface DropzoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'>, VariantProps<typeof dropzoneVariants> {
    accept?: Accept;
    multiple?: boolean;
    maxFiles?: number;
    disabled?: boolean;
    inputId?: string;
    inputAriaLabel?: string;
    inputTestId?: string;
    onDropAccepted?: (files: File[], event: DropEvent) => void;
    onDropRejected?: (fileRejections: FileRejection[], event: DropEvent) => void;
    children?: React.ReactNode | ((props: DropzoneRenderProps) => React.ReactNode);
}

export const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(({
    accept,
    multiple = false,
    maxFiles = multiple ? 0 : 1,
    disabled = false,
    inputId,
    inputAriaLabel,
    inputTestId,
    onDropAccepted,
    onDropRejected,
    variant,
    className,
    children,
    ...props
}, ref) => {
    const {
        getRootProps,
        getInputProps,
        rootRef,
        isDragActive,
        isDragAccept,
        isDragReject,
        isFocused,
        isFileDialogActive,
        open
    } = useDropzone({
        accept,
        multiple,
        maxFiles,
        disabled,
        onDropAccepted,
        onDropRejected
    });

    const content = typeof children === 'function'
        ? children({isDragActive, isDragAccept, isDragReject, isFocused, isFileDialogActive, open})
        : children;

    const setRootRefs = (element: HTMLDivElement | null) => {
        (rootRef as React.MutableRefObject<HTMLDivElement | null>).current = element;

        if (typeof ref === 'function') {
            ref(element);
        } else if (ref) {
            ref.current = element;
        }
    };

    const dropzoneRootProps = getRootProps({
        ...props,
        role: 'button',
        tabIndex: disabled ? -1 : 0,
        'aria-disabled': disabled,
        'aria-invalid': isDragReject || undefined,
        className: cn(
            dropzoneVariants({variant}),
            disabled && 'pointer-events-none cursor-not-allowed opacity-60',
            isDragReject && 'border-state-danger bg-state-danger/10',
            isDragActive && !isDragReject && !disabled && 'border-state-success bg-state-success/10',
            className
        )
    }) as React.HTMLAttributes<HTMLDivElement> & {ref?: React.Ref<HTMLDivElement>};

    // Destructure out the ref from getRootProps — we use setRootRefs instead
    const {ref: _, ...rootProps} = dropzoneRootProps; // eslint-disable-line @typescript-eslint/no-unused-vars

    return (
        <div
            ref={setRootRefs}
            {...rootProps}
        >
            <input {...getInputProps()} aria-label={inputAriaLabel} data-testid={inputTestId} id={inputId} />
            {content}
        </div>
    );
});

Dropzone.displayName = 'Dropzone';

export {dropzoneVariants};
