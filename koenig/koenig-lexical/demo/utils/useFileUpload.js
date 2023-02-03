import {useState} from 'react';

export function useFileUpload() {
    const [progress, setProgress] = useState(100);
    const [isLoading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [filesNumber, setFilesNumber] = useState(0);

    async function upload(files = []) {
        setFilesNumber(files.length);
        // added delay for demo, helps to check progress bar
        setLoading(true);
        setProgress(30);
        await delay(200);
        setProgress(60);
        await delay(200);
        setProgress(90);
        await delay(200);

        // simulate upload errors for the sake of testing
        // Any file that has "fail" in the filename will return errors
        const fileErrors = Array.from(files).filter(file => file.name.includes('fail'));
        if (fileErrors.length) {
            setErrors(fileErrors.map(file => ({fileName: file.name, message: 'Upload failed'})));
            setLoading(false);
            setProgress(100);
            return null;
        }

        const uploadResult = Array.from(files).map(file => URL.createObjectURL(file));

        setProgress(100);
        setLoading(false);

        setErrors([]); // components expect array of objects: { fileName: string, message: string }[]

        return uploadResult;
    }

    return {progress, isLoading, upload, errors, filesNumber};
}

function delay(time) {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
