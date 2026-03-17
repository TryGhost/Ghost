import * as React from 'react';
import {Accept, DropEvent, FileRejection, useDropzone} from 'react-dropzone';
import {cn} from '@/lib/utils';

type DropzoneRenderProps = {
    isDragActive: boolean;
    isDragAccept: boolean;
    isDragReject: boolean;
    isFocused: boolean;
    isFileDialogActive: boolean;
    open: () => void;
};

export interface DropzoneProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'children'> {
    accept?: Accept;
    multiple?: boolean;
    maxFiles?: number;
    disabled?: boolean;
    onDropAccepted?: (files: File[], event: DropEvent) => void;
    onDropRejected?: (fileRejections: FileRejection[], event: DropEvent) => void;
    children?: React.ReactNode | ((props: DropzoneRenderProps) => React.ReactNode);
}

export const Dropzone = React.forwardRef<HTMLDivElement, DropzoneProps>(({
    accept,
    multiple = false,
    maxFiles = multiple ? 0 : 1,
    disabled = false,
    onDropAccepted,
    onDropRejected,
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
        className: cn(
            'flex cursor-pointer flex-col items-center justify-center rounded-md border-2 border-dashed p-10 transition-colors outline-hidden focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
            disabled && 'cursor-not-allowed opacity-60 pointer-events-none',
            isDragReject && 'border-red-500 bg-red-50 dark:bg-red-950/20',
            isDragActive && !isDragReject && !disabled && 'border-green-500 bg-green-50 dark:bg-green-950/20',
            !isDragActive && (disabled ? 'border-grey-300' : 'border-grey-300 hover:border-grey-400'),
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
            <input {...getInputProps()} />
            {content}
        </div>
    );
});

Dropzone.displayName = 'Dropzone';
