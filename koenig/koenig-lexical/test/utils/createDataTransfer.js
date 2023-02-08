import fs from 'fs';

export default async function createDataTransfer(page, data) {
    const buffer = fs.readFileSync(data.filePath).toString('base64');

    return await page.evaluateHandle(
        async ({bufferData, fileName, fileType}) => {
            const dataTransfer = new DataTransfer();

            const blobData = await fetch(bufferData).then(res => res.blob());

            const file = new File([blobData], fileName, {type: fileType});
            dataTransfer.items.add(file);
            return dataTransfer;
        },
        {
            bufferData: `data:application/octet-stream;base64,${buffer}`,
            fileName: data.fileName,
            fileType: data.fileType
        }
    );
}
