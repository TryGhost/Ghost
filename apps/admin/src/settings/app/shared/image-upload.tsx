import { type ReactNode, useState } from "react";
import { LucideIcon, cn } from "@tryghost/shade/utils";

/**
 * Minimal image-upload control keeping the legacy ImageUpload test contract:
 * a label-wrapped hidden file input while empty (so the upload affordance is
 * addressable by its label text), and once an image is set, a container
 * (`image-upload-container`) with the img (carrying `id`) and a delete
 * button (`image-delete-button`).
 */

export interface ImageUploadProps {
    id: string;
    imageURL?: string;
    /** The upload affordance's content — doubles as its accessible label. */
    children?: ReactNode;
    imageTestId?: string;
    inputTestId?: string;
    containerClassName?: string;
    imageClassName?: string;
    fileUploadClassName?: string;
    deleteButtonClassName?: string;
    deleteButtonContent?: ReactNode;
    editButtonAriaLabel?: string;
    editButtonClassName?: string;
    editButtonContent?: ReactNode;
    /** Renders an edit button beside delete (the Pintura affordance). */
    onEdit?: () => void;
    onUpload: (file: File) => void | Promise<void>;
    onDelete: () => void;
}

export function ImageUpload({
    id,
    imageURL,
    children,
    imageTestId,
    inputTestId,
    containerClassName,
    imageClassName,
    fileUploadClassName,
    deleteButtonClassName,
    deleteButtonContent,
    editButtonAriaLabel,
    editButtonClassName,
    editButtonContent,
    onEdit,
    onUpload,
    onDelete,
}: ImageUploadProps) {
    // Remount the input after every upload so choosing the same file twice
    // still fires onChange (the legacy FileUpload contract).
    const [fileKey, setFileKey] = useState(0);

    const input = (
        <input
            key={fileKey}
            data-testid={inputTestId}
            id={`${id}-input`}
            type="file"
            hidden
            onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                    void onUpload(file);
                    setFileKey((key) => key + 1);
                }
            }}
        />
    );

    if (imageURL) {
        return (
            <div className={cn("group relative flex justify-center", containerClassName)} data-testid="image-upload-container">
                <img alt="" className={cn("w-full", imageClassName)} data-testid={imageTestId} id={id} src={imageURL} />
                {onEdit && (
                    <button
                        aria-label={editButtonAriaLabel}
                        className={cn(
                            "absolute top-4 right-14 flex size-8 cursor-pointer items-center justify-center rounded bg-black/75 text-white group-hover:visible! hover:bg-black md:invisible",
                            editButtonClassName,
                        )}
                        data-testid="image-edit-button"
                        type="button"
                        onClick={onEdit}
                    >
                        {editButtonContent ?? <LucideIcon.Pencil className="size-4" />}
                    </button>
                )}
                <button
                    className={cn(
                        "absolute top-4 right-4 flex size-8 cursor-pointer items-center justify-center rounded bg-black/75 text-white group-hover:visible! hover:bg-black md:invisible",
                        deleteButtonClassName,
                    )}
                    data-testid="image-delete-button"
                    type="button"
                    onClick={onDelete}
                >
                    {deleteButtonContent ?? <LucideIcon.Trash2 className="size-4" />}
                </button>
                {input}
            </div>
        );
    }

    return (
        <label
            className={cn(
                "flex cursor-pointer items-center justify-center rounded border border-border bg-muted p-3 font-medium text-muted-foreground hover:text-foreground",
                fileUploadClassName,
            )}
            htmlFor={`${id}-input`}
        >
            {children}
            {input}
        </label>
    );
}
