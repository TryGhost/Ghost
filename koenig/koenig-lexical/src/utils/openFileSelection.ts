// Triggers the file selection dialog from a given referenced element

export function openFileSelection({fileInputRef}: {fileInputRef: React.RefObject<HTMLInputElement | null>}): void {
    fileInputRef.current?.click();
}
