import {isTestEnv} from '../../test/utils/isTestEnv';
import {useState} from 'react';
import type {FileTypeConfig, FileUploadResultItem} from '../../src/context/KoenigComposerContext';

interface FileError {
    fileName: string;
    message: string;
}

interface UploadResult extends FileUploadResultItem {
    fileName: string;
}

export const fileTypes: Record<string, FileTypeConfig> = {
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
    },
    file: {
        mimeTypes: [],
        extensions: []
    }
};

export function useFileUpload({isMultiplayer = false} = {}) {
    return function useFileUploadFn(type = '') {
        const [progress, setProgress] = useState(100);
        const [isLoading, setLoading] = useState(false);
        const [errors, setErrors] = useState<FileError[]>([]);
        const [filesNumber, setFilesNumber] = useState(0);

        function defaultValidator(file: File): string | true {
            if (type === 'file') {
                return true;
            }
            const extensions = fileTypes[type]?.extensions;
            const match = (/(?:\.([^.]+))?$/).exec(file.name);
            const extension = match ? match[1] : undefined;

            // if extensions is falsy exit early and accept all files
            if (!extensions) {
                return true;
            }

            if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
                const validExtensions = `.${extensions.join(', .').toUpperCase()}`;
                return `The file type you uploaded is not supported. Please use ${validExtensions}`;
            }
            return true;
        }

        function validate(files: File[] | FileList = []): FileError[] {
            const validationResult: FileError[] = [];

            for (const file of Array.from(files)) {
                const result = defaultValidator(file);
                if (result === true) {
                    continue;
                }

                validationResult.push({fileName: file.name, message: result});
            }

            return validationResult;
        }

        async function upload(files: File[] | FileList = [], _options: Record<string, unknown> = {}): Promise<UploadResult[] | null> {
            const fileArray = Array.from(files);

            setFilesNumber(fileArray.length);
            // added delay for demo, helps to check progress bar
            setLoading(true);

            const validationResult = validate(fileArray);

            if (validationResult.length) {
                setErrors(validationResult);
                setLoading(false);
                setProgress(100);

                return null;
            }

            let stepDelay = 200;
            // adjust when testing to speed up tests
            if (isTestEnv) {
                stepDelay = 5;
            }

            setProgress(30);
            await delay(stepDelay);
            setProgress(60);
            await delay(stepDelay);
            setProgress(90);
            await delay(stepDelay);

            // simulate upload errors for the sake of testing
            // Any file that has "fail" in the filename will return errors
            const fileErrors = fileArray.filter(file => file.name?.includes('fail'));
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
            let uploadResult: UploadResult[] = [];

            if (isMultiplayer) {
                // multiplayer needs to store the whole file data inline so it can be transferred
                // and stored in the shared document, otherwise images etc won't appear across browsers
                for (const file of fileArray) {
                    const reader = new FileReader();
                    const url = await new Promise<string>((resolve) => {
                        reader.addEventListener('load', () => {
                            resolve(typeof reader.result === 'string' ? reader.result : '');
                        }, false);
                        reader.readAsDataURL(file);
                    });

                    uploadResult.push({
                        url,
                        fileName: file.name
                    });
                }
            } else {
                // for non-multiplayer editors, use blob urls as they are much shorter meaning they
                // are nicer to work with in things like the markdown card and in the state tree
                uploadResult = fileArray.map(file => ({
                    url: URL.createObjectURL(file),
                    fileName: file.name
                }));
            }

            setProgress(100);
            setLoading(false);

            setErrors([]); // components expect array of objects: { fileName: string, message: string }[]

            return uploadResult;
        }

        return {progress, isLoading, upload, errors, filesNumber};
    };
}

function delay(time: number): Promise<void> {
    return new Promise((resolve) => {
        setTimeout(resolve, time);
    });
}
