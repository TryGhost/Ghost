export async function dataSrcToFile(src: string, fileName?: string): Promise<File | undefined> {
    if (!src.startsWith('data:')) {
        return;
    }

    const mimeType = src.split(',')[0].split(':')[1].split(';')[0];

    if (!fileName) {
        const uuid = getRandomFileId();
        const extension = mimeType.split('/')[1];
        fileName = `data-src-image-${uuid}.${extension}`;
    }

    const blob = await fetch(src).then(it => it.blob());
    const file = new File([blob], fileName, {type: mimeType, lastModified: Date.now()});

    return file;
}

function getRandomFileId() {
    if (window.crypto.randomUUID) {
        return window.crypto.randomUUID();
    }

    const randomBytes = new Uint8Array(16);
    window.crypto.getRandomValues(randomBytes);

    return [...randomBytes]
        .map(byte => byte.toString(16).padStart(2, '0'))
        .join('');
}
