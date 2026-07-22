import { type ReactNode, useState } from "react";
import { buttonVariants } from "@tryghost/shade/components";
import { cn } from "@tryghost/shade/utils";

/**
 * A button-styled file picker (label + hidden input carrying the given id —
 * the legacy FileUpload contract, so suites can address `input#upload-…`
 * directly). The input remounts after every pick so choosing the same file
 * twice still fires onChange.
 */

export interface FileUploadButtonProps {
    id: string;
    accept?: string;
    children: ReactNode;
    className?: string;
    onUpload: (file: File) => void;
}

export function FileUploadButton({ id, accept, children, className, onUpload }: FileUploadButtonProps) {
    const [fileKey, setFileKey] = useState(0);

    return (
        <label className={cn(buttonVariants({ variant: "outline", size: "sm" }), "cursor-pointer", className)} htmlFor={id}>
            {children}
            <input
                key={fileKey}
                accept={accept}
                id={id}
                type="file"
                hidden
                onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) {
                        onUpload(file);
                    }
                    setFileKey(Date.now());
                }}
            />
        </label>
    );
}
