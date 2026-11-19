import type {ChangeEvent} from 'react';

function getFileName(blob: Blob, fileName: string) {
    const extension = blob.type.split('/')[1]?.split('+')[0];

    if (!extension || fileName.includes('.')) {
        return fileName;
    }

    return `${fileName}.${extension === 'jpeg' ? 'jpg' : extension}`;
}

function createFileList(files: File[]) {
    const dataTransfer = new DataTransfer();
    files.forEach(file => dataTransfer.items.add(file));
    return dataTransfer.files;
}

export function createFileInputChangeEventFromBlob(blob: Blob, fileName = 'edited-image'): ChangeEvent<HTMLInputElement> {
    const input = document.createElement('input');
    input.type = 'file';
    input.files = createFileList([
        blob instanceof File ? blob : new File([blob], getFileName(blob, fileName), {type: blob.type})
    ]);

    return {
        target: input,
        currentTarget: input
    } as ChangeEvent<HTMLInputElement>;
}
