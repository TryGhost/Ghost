export async function imageUploader(files) {
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

const delay = time => new Promise((resolve) => {
    setTimeout(resolve, time);
});

export async function getImageUrl(files = []) {
    await delay(1000); // added delay for demo, helps to check progress bar
    return Array.from(files).map(file => URL.createObjectURL(file));
}
