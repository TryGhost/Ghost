import {useRef, useState} from 'react';
import {getGhostPaths} from '../utils/helpers';

// File type configuration interface
interface FileTypeConfig {
    mimeTypes: string[];
    extensions: string[];
    endpoint: string;
    resourceName: string;
}

// File types configuration for Koenig file uploads
export const fileTypes: Record<string, FileTypeConfig> = {
    image: {
        mimeTypes: ['image/gif', 'image/jpg', 'image/jpeg', 'image/png', 'image/svg+xml', 'image/webp'],
        extensions: ['gif', 'jpg', 'jpeg', 'png', 'svg', 'svgz', 'webp'],
        endpoint: '/images/upload/',
        resourceName: 'images'
    },
    video: {
        mimeTypes: ['video/mp4', 'video/webm', 'video/ogg'],
        extensions: ['mp4', 'webm', 'ogv'],
        endpoint: '/media/upload/',
        resourceName: 'media'
    },
    audio: {
        mimeTypes: ['audio/mp3', 'audio/mpeg', 'audio/ogg', 'audio/wav', 'audio/vnd.wav', 'audio/wave', 'audio/x-wav', 'audio/mp4', 'audio/x-m4a'],
        extensions: ['mp3', 'wav', 'ogg', 'm4a'],
        endpoint: '/media/upload/',
        resourceName: 'media'
    },
    file: {
        mimeTypes: [],
        extensions: [],
        endpoint: '/files/upload/',
        resourceName: 'files'
    }
};

export type FileType = 'image' | 'video' | 'audio' | 'file';

export interface UploadResult {
    url: string;
    fileName: string;
}

export interface UploadError {
    fileName: string;
    message: string;
}

/**
 * Custom hook for file uploads that matches Koenig's expected interface.
 * Use this with KoenigComposer's fileUploader prop.
 *
 * @example
 * const fileUploader = {useFileUpload, fileTypes};
 * <KoenigComposer fileUploader={fileUploader} ... />
 */
export const useFileUpload = (type: FileType = 'image') => {
    const [progress, setProgress] = useState(0);
    const [isLoading, setLoading] = useState(false);
    const [errors, setErrors] = useState<UploadError[]>([]);
    const [filesNumber, setFilesNumber] = useState(0);
    const progressTracker = useRef(new Map<File, number>());

    const updateProgress = () => {
        if (progressTracker.current.size === 0) {
            setProgress(0);
            return;
        }
        let totalProgress = 0;
        progressTracker.current.forEach(value => totalProgress += value);
        setProgress(Math.round(totalProgress / progressTracker.current.size));
    };

    const validateFile = (file: File): string | true => {
        const config = fileTypes[type];
        const extensions = config?.extensions;

        // If no extensions defined (like for 'file' type), accept all
        if (!extensions || extensions.length === 0) {
            return true;
        }

        const match = /(?:\.([^.]+))?$/.exec(file.name);
        const extension = match?.[1]?.toLowerCase();

        if (!extension || !extensions.includes(extension)) {
            const validExtensions = `.${extensions.join(', .').toUpperCase()}`;
            return `The file type you uploaded is not supported. Please use ${validExtensions}`;
        }
        return true;
    };

    const uploadFile = async (file: File): Promise<UploadResult> => {
        progressTracker.current.set(file, 0);

        const formData = new FormData();
        formData.append('file', file, file.name);

        const {apiRoot} = getGhostPaths();
        const url = `${apiRoot}${fileTypes[type].endpoint}`;

        return new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();

            xhr.upload.addEventListener('progress', (event) => {
                if (event.lengthComputable) {
                    progressTracker.current.set(file, (event.loaded / event.total) * 100);
                    updateProgress();
                }
            });

            xhr.addEventListener('load', () => {
                progressTracker.current.set(file, 100);
                updateProgress();

                if (xhr.status >= 200 && xhr.status < 300) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        const resource = response[fileTypes[type].resourceName];
                        if (resource?.[0]?.url) {
                            resolve({url: resource[0].url, fileName: file.name});
                        } else {
                            reject({fileName: file.name, message: 'Invalid response from server'});
                        }
                    } catch {
                        reject({fileName: file.name, message: 'Failed to parse server response'});
                    }
                } else {
                    try {
                        const errorResponse = JSON.parse(xhr.responseText);
                        const message = errorResponse?.errors?.[0]?.message || 'Upload failed';
                        reject({fileName: file.name, message});
                    } catch {
                        reject({fileName: file.name, message: 'Upload failed'});
                    }
                }
            });

            xhr.addEventListener('error', () => {
                reject({fileName: file.name, message: 'Network error during upload'});
            });

            xhr.open('POST', url);
            xhr.withCredentials = true;
            xhr.send(formData);
        });
    };

    const upload = async (files: File[] | FileList = []): Promise<UploadResult[] | null> => {
        // Convert FileList to array if needed
        const fileArray = Array.isArray(files) ? files : Array.from(files || []);

        setFilesNumber(fileArray.length);
        setLoading(true);
        setErrors([]);

        // Validate files
        const validationErrors: UploadError[] = [];
        for (const file of fileArray) {
            const result = validateFile(file);
            if (result !== true) {
                validationErrors.push({fileName: file.name, message: result});
            }
        }

        if (validationErrors.length > 0) {
            setErrors(validationErrors);
            setLoading(false);
            setProgress(100);
            return null;
        }

        try {
            const uploadPromises: Promise<UploadResult>[] = [];
            for (const file of fileArray) {
                uploadPromises.push(uploadFile(file));
            }
            const results = await Promise.all(uploadPromises);
            setProgress(100);
            progressTracker.current.clear();
            setLoading(false);
            return results;
        } catch (error) {
            const uploadError = error as UploadError;
            setErrors(prev => [...prev, uploadError]);
            setLoading(false);
            setProgress(100);
            progressTracker.current.clear();
            return null;
        }
    };

    return {progress, isLoading, upload, errors, filesNumber};
};
