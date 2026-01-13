// Re-export file upload utilities
export {fileTypes, useFileUpload} from '../hooks/use-file-upload';
export type {FileType, UploadResult, UploadError} from '../hooks/use-file-upload';

// Type for the Koenig lexical fetcher function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FetchKoenigLexical = () => Promise<any>;

/**
 * Suspense-compatible resource loader for Koenig lexical editor.
 * Creates a resource that can be used with React Suspense to lazy-load Koenig.
 */
export const loadKoenig = function (fetchKoenigLexical: FetchKoenigLexical) {
    let status = 'pending';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let response: any;

    const suspender = fetchKoenigLexical().then(
        (res) => {
            status = 'success';
            response = res;
        },
        (err) => {
            status = 'error';
            response = err;
        }
    );

    const read = () => {
        switch (status) {
        case 'pending':
            throw suspender;
        case 'error':
            throw response;
        default:
            return response;
        }
    };

    return {read};
};

export type EditorResource = ReturnType<typeof loadKoenig>;

// Import for koenigFileUploader (re-exported above, but needed for the object)
import {fileTypes as _fileTypes, useFileUpload as _useFileUpload} from '../hooks/use-file-upload';

/**
 * Pre-configured file uploader object for use with KoenigComposer.
 *
 * @example
 * <KoenigComposer fileUploader={koenigFileUploader} ... />
 */
export const koenigFileUploader = {useFileUpload: _useFileUpload, fileTypes: _fileTypes};
