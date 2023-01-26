import {useRef} from 'react';

export default function useMarkdownImageUploader(editor, imageUploader) {
    const imageInputRef = useRef(null);
    const {progress, upload, errors, isLoading, filesNumber} = imageUploader();

    const uploadImages = async (event) => {
        const files = event.target.files;
        const filesSrc = await upload(files);
        insertImages(filesSrc);
    };

    function openImageUploadDialog() {
        imageInputRef.current.click();
    }

    function insertUnsplashImage({src, alt, caption}) {
        let image = {
            alt,
            url: src,
            credit: `<small>${caption}</small>`
        };

        insertImages([image]);
    }

    function insertImages(urls = []) {
        const codemirror = editor.current.codemirror;

        // loop through urls and generate image markdown
        let images = urls.map((url) => {
            // plain url string, so extract filename from path
            if (typeof url === 'string') {
                let filename = url.split('/').pop();
                let alt = filename;

                // if we have a normal filename.ext, set alt to filename -ext
                if (filename.lastIndexOf('.') > 0) {
                    alt = filename.slice(0, filename.lastIndexOf('.'));
                }

                return `![${alt}](${url})`;

                // full url object, use attrs we're given
            } else {
                let image = `![${url.alt}](${url.url})`;

                if (url.credit) {
                    image += `\n${url.credit}`;
                }

                return image;
            }
        });
        let text = images.join('\n\n');

        editor.current.codemirror.focus();

        // insert at cursor or replace selection then position cursor at end
        // of inserted text
        codemirror.replaceSelection(text, 'end');
    }

    return {
        openImageUploadDialog,
        uploadImages,
        insertUnsplashImage,
        imageInputRef,
        progress,
        errors,
        isLoading,
        filesNumber
    };
}
