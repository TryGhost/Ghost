import {useState} from 'react';

export const fileTypes = {
    image: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp']
    },
    video: {
        mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
        extensions: ['mp4', 'webm', 'ogv']
    },
    audio: {
        mimeTypes: ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/vnd.wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'],
        extensions: ['mp3', 'wav', 'ogg', 'm4a']
    },
    mediaThumbnail: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'webp']
    }
};

export function useFileUpload(type = '') {
    const [progress, setProgress] = useState(100);
    const [isLoading, setLoading] = useState(false);
    const [errors, setErrors] = useState([]);
    const [filesNumber, setFilesNumber] = useState(0);

    function defaultValidator(file) {
        let extensions = fileTypes[type].extensions;
        let [, extension] = (/(?:\.([^.]+))?$/).exec(file.name);

        // if extensions is falsy exit early and accept all files
        if (!extensions) {
            return true;
        }

        if (!Array.isArray(extensions)) {
            extensions = extensions.split(',');
        }

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            let validExtensions = `.${extensions.join(', .').toUpperCase()}`;
            return `The file type you uploaded is not supported. Please use ${validExtensions}`;
        }

        return true;
    }

    function validate(files = []) {
        const validationResult = [];

        for (let i = 0; i < files.length; i += 1) {
            let file = files[i];
            let result = defaultValidator(file);
            if (result === true) {
                continue;
            }

            validationResult.push({fileName: file.name, message: result});
        }

        return validationResult;
    }

    async function upload(files = [], options = {}) {
        setFilesNumber(files.length);
        // added delay for demo, helps to check progress bar
        setLoading(true);

        const validationResult = validate(files);

        if (validationResult.length) {
            setErrors(validationResult);
            setLoading(false);
            setProgress(100);

            return null;
        }

        let stepDelay = 200;
        // adjust when testing to speed up tests
        if (import.meta.env.VITE_TEST === 'true') {
            stepDelay = 50;
        }

        setProgress(30);
        await delay(stepDelay);
        setProgress(60);
        await delay(stepDelay);
        setProgress(90);
        await delay(stepDelay);

        // simulate upload errors for the sake of testing
        // Any file that has "fail" in the filename will return errors
        const fileErrors = Array.from(files).filter(file => file.name?.includes('fail'));
        if (fileErrors.length) {
            setErrors(fileErrors.map(file => ({fileName: file.name, message: 'Upload failed'})));
            setLoading(false);
            setProgress(100);
            return null;
        }

        // uploadResult contains an object for each upload as we want to be able to return
        // server-provided meta data for future card uses (e.g. audio id3, image exif).
        //
        // returning fileName is import so upload results can be mapped back to the original
        // file for multi-file uploads such as in gallery cards where we need to replace
        // the correct preview image with the real uploaded image
        // TODO: can we use something more unique than filename?
        const uploadResult = Array.from(files).map(file => ({
            url: URL.createObjectURL(file),
            fileName: file.name
        }));

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
