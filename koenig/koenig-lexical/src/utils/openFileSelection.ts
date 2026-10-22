import type {RefObject} from 'react';

// Triggers the file selection dialog from a given referenced element

export function openFileSelection({fileInputRef}: {fileInputRef: RefObject<HTMLInputElement | null>}): void {
    fileInputRef.current?.click();
}
