export async function dataSrcToFile(src, fileName) {
    if (!src.startsWith('data:')) {
        return;
    }

    const mimeType = src.split(',')[0].split(':')[1].split(';')[0];

    if (!fileName) {
        let uuid;
        try {
            uuid = window.crypto.randomUUID();
        } catch (e) {
            uuid = Math.random().toString(36).substring(2, 15);
        }
        const extension = mimeType.split('/')[1];
        fileName = `data-src-image-${uuid}.${extension}`;
    }

    const blob = await fetch(src).then(it => it.blob());
    const file = new File([blob], fileName, {type: mimeType, lastModified: new Date()});

    return file;
}
