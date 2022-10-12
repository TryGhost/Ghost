async function imageUploader(files) {
    function convertToURL(file) {
        return new Promise((resolve, reject) => {
            const fileReader = new FileReader();
            fileReader.readAsDataURL(file);
            fileReader.onload = () => {
                resolve(fileReader.result);
            };
            fileReader.onerror = (error) => {
                reject(error);
            };
        });
    }
    if (files && files[0]) {
        const file = files[0];
        const url = await convertToURL(file);
        return {
            src: url
        };
    }
}

export {imageUploader};
