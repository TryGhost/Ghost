import fs from 'fs';

export default async function createDataTransfer(page, data = []) {
    const filesData = [];

    data.forEach((file) => {
        const buffer = fs.readFileSync(file.filePath);

        filesData.push({
            buffer: buffer.toJSON().data,
            name: file.fileName,
            type: file.fileType
        });
    });

    return await page.evaluateHandle((dataset = []) => {
        const dt = new DataTransfer();

        dataset.forEach((fileData) => {
            const file = new File([new Uint8Array(fileData.buffer)], fileData.name, {type: fileData.type});
            dt.items.add(file);
        });

        return dt;
    }, filesData);
}
