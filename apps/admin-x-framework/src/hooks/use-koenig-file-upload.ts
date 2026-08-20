import {useRef, useState} from 'react';
import {getGhostPaths} from '../utils/helpers';
import {useFetchApi} from '../utils/api/fetch-api';

export const koenigFileUploadTypes = {
    image: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'],
        endpoint: '/images/upload/',
        requestMethod: 'post',
        resourceName: 'images'
    },
    video: {
        mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
        extensions: ['mp4', 'webm', 'ogv'],
        endpoint: '/media/upload/',
        requestMethod: 'post',
        resourceName: 'media'
    },
    audio: {
        mimeTypes: ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/vnd.wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'],
        extensions: ['mp3', 'wav', 'ogg', 'm4a'],
        endpoint: '/media/upload/',
        requestMethod: 'post',
        resourceName: 'media'
    },
    mediaThumbnail: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'webp'],
        endpoint: '/media/thumbnail/upload/',
        requestMethod: 'put',
        resourceName: 'media'
    },
    file: {
        extensions: [],
        endpoint: '/files/upload/',
        requestMethod: 'post',
        resourceName: 'files'
    }
} as const;

export type KoenigFileUploadType = keyof typeof koenigFileUploadTypes;

interface UploadOptions {
    formData?: Record<string, string | Blob>;
}

interface UploadError {
    fileName: string;
    message: string;
    context?: string;
}

interface UploadResult {
    url: undefined | string;
    fileName: string;
}

interface FileUploadHook {
    progress: number;
    isLoading: boolean;
    errors: UploadError[];
    filesNumber: number;
    upload: (files: FileList | ReadonlyArray<File>) => Promise<UploadResult[] | null>;
}

const getStringAtPath = (maybeObj: unknown, path: Iterable<PropertyKey>): null | string => {
    let current = maybeObj;
    for (const key of path) {
        if (current && typeof current === 'object' && key in current) {
            current = (current as Record<PropertyKey, unknown>)[key];
        } else {
            return null;
        }
    }
    return (typeof current === 'string') ? current : null;
};

interface KoenigFileUploadOptions {
    /**
     * Maximum accepted file size in bytes, from `hostSettings.limits.uploads.max`.
     * Checked before the request is made, which the server-side limit cannot do:
     * a reverse proxy in front of Ghost may reject an oversized body before it
     * ever reaches the API, so the host limit's error never gets a chance to run.
     */
    maxUploadSize?: number;
}

// Config can reach the browser via environment variables, where every value is a
// string, so coerce before comparing against `File.size`.
const resolveUploadLimit = (limit: undefined | number): null | number => {
    const bytes = Number(limit);
    return Number.isFinite(bytes) && bytes > 0 ? bytes : null;
};

// The limit service reports upload limits in decimal MB, so quote the same unit
// back rather than switching to mebibytes.
const formatUploadLimit = (bytes: number): string => `${Math.round((bytes / 1000000) * 10) / 10}MB`;

export const useKoenigFileUpload = (type: KoenigFileUploadType = 'image', {maxUploadSize}: KoenigFileUploadOptions = {}): FileUploadHook => {
    const [progress, setProgress] = useState(0);
    const [isLoading, setLoading] = useState(false);
    const [errors, setErrors] = useState<UploadError[]>([]);
    const [filesNumber, setFilesNumber] = useState(0);

    const progressTracker = useRef(new Map());

    const fetchApi = useFetchApi();
    const uploadLimit = resolveUploadLimit(maxUploadSize);

    function updateProgress() {
        if (progressTracker.current.size === 0) {
            setProgress(0);
            return;
        }

        let totalProgress = 0;

        progressTracker.current.forEach((value) => {
            totalProgress += value;
        });

        setProgress(Math.round(totalProgress / progressTracker.current.size));
    }

    // we only check the file extension by default because IE doesn't always
    // expose the mime-type, we'll rely on the API for final validation
    const defaultValidator = (file: File): true | string => {
        // Size is checked ahead of the early return below: the file card accepts
        // any file type, and is the one most likely to be handed something huge.
        if (uploadLimit !== null && file.size > uploadLimit) {
            return `The file you uploaded is larger than the maximum file size of ${formatUploadLimit(uploadLimit)}.`;
        }

        // if type is file we don't need to validate since the card can accept any file type
        if (type === 'file') {
            return true;
        }
        const extensions = koenigFileUploadTypes[type].extensions as readonly string[];
        const [, extension] = (/(?:\.([^.]+))?$/).exec(file.name) ?? [];

        // if extensions is falsy exit early and accept all files
        if (!extensions) {
            return true;
        }

        if (!extension || extensions.indexOf(extension.toLowerCase()) === -1) {
            const validExtensions = `.${extensions.join(', .').toUpperCase()}`;
            return `The file type you uploaded is not supported. Please use ${validExtensions}`;
        }

        return true;
    };

    const validate = (files: ArrayLike<File> = []) => {
        const validationResult = [];

        for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            const result = defaultValidator(file);
            if (result === true) {
                continue;
            }

            validationResult.push({fileName: file.name, message: result});
        }

        return validationResult;
    };

    const uploadFile = async (file: File, {formData = {}}: UploadOptions = {}) => {
        progressTracker.current.set(file, 0);

        const fileFormData = new FormData();
        fileFormData.append('file', file, file.name);

        Object.keys(formData).forEach((key) => {
            fileFormData.append(key, formData[key]);
        });

        const url = `${getGhostPaths().apiRoot}${koenigFileUploadTypes[type].endpoint}`;

        try {
            const uploadResponse = await fetchApi(url, {
                method: koenigFileUploadTypes[type].requestMethod,
                body: fileFormData,
                onUploadProgress(uploadProgress) {
                    progressTracker.current.set(file, uploadProgress);
                    updateProgress();
                }
            });

            progressTracker.current.set(file, 100);
            updateProgress();

            let responseUrl: undefined | string;
            if (uploadResponse) {
                const resource = uploadResponse[koenigFileUploadTypes[type].resourceName];
                if (resource && Array.isArray(resource) && resource[0]) {
                    responseUrl = resource[0].url;
                }
            }

            return {
                url: responseUrl,
                fileName: file.name
            };
        } catch (error) {
            console.error(error); // eslint-disable-line

            // The API wraps some errors (e.g. HostLimitError) with a generic
            // message and puts the specific, user-actionable text in `context`.
            // Prefer `context` so the user sees the useful message, falling back
            // to `message` for errors that don't set a context.
            const context = getStringAtPath(error, ['data', 'errors', 0, 'context']) || '';
            const message = getStringAtPath(error, ['data', 'errors', 0, 'message']) || getStringAtPath(error, ['message']) || '';

            const errorResult = {
                message: context || message,
                context,
                fileName: file.name
            };

            throw errorResult;
        }
    };

    const upload = async (files: FileList | ReadonlyArray<File> = [], options: UploadOptions = {}) => {
        setFilesNumber(files.length);
        setLoading(true);
        // Each upload attempt starts fresh so retries don't accumulate
        // duplicate error messages from previous failed attempts.
        setErrors([]);

        const validationResult = validate(files);

        if (validationResult.length) {
            setErrors(validationResult);
            setLoading(false);
            setProgress(100);

            return null;
        }

        const uploadPromises = [];

        for (let i = 0; i < files.length; i += 1) {
            const file = files[i];
            uploadPromises.push(uploadFile(file, options));
        }

        try {
            const uploadResult = await Promise.all(uploadPromises);
            setProgress(100);
            progressTracker.current.clear();

            setLoading(false);

            setErrors([]); // components expect array of objects: { fileName: string, message: string }[]

            return uploadResult;
        } catch (error) {
            console.error(error); // eslint-disable-line no-console

            setErrors([error as UploadError]);
            setLoading(false);
            setProgress(100);
            progressTracker.current.clear();

            return null;
        }
    };

    return {progress, isLoading, upload, errors, filesNumber};
};

/**
 * Builds the `fileUploader` object Koenig expects, with an upload size limit
 * applied. Memoize the result on `maxUploadSize` so the editor's context value
 * stays stable across renders.
 */
export const createKoenigFileUploader = (maxUploadSize: undefined | number) => ({
    fileTypes: koenigFileUploadTypes,
    useFileUpload: function useFileUpload(type: KoenigFileUploadType = 'image') {
        return useKoenigFileUpload(type, {maxUploadSize});
    }
});
