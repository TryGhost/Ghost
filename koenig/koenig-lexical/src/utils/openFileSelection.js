// Triggers the file selection dialog from a given referenced element

export function openFileSelection({fileInputRef}) {
    fileInputRef.current.click();
}