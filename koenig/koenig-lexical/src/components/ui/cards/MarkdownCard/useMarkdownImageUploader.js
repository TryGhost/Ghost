import {useRef, useState} from 'react';

export default function useMarkdownImageUploader(editor, imageUploader) {
    const imageInputRef = useRef(null);
    const [selection, setSelection] = useState(null);
    const [isImageLoading, setImageLoading] = useState(false);

    const uploadImages = async (event) => {
        setImageLoading(true);
        const files = event.target.files;
        const filesSrc = await imageUploader(files);
        insertImages(filesSrc);
        setImageLoading(false);
    };

    const captureSelection = () => {
        setSelection({
            anchor: editor.current.codemirror.getCursor('anchor'),
            head: editor.current.codemirror.getCursor('head')
        });
    };

    function openImageUploadDialog() {
        captureSelection();

        imageInputRef.current.click();
    }

    function focusEditor() {
        editor.current.codemirror.focus();
        editor.current.codemirror.execCommand('goDocEnd');
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

        // clicking the image toolbar button will lose the selection so we use
        // the captured selection to re-select here
        if (selection) {
            // we want to focus but not re-position
            focusEditor();

            // re-select and clear the captured selection so drag/drop still
            // inserts at the correct place
            codemirror.setSelection(
                selection.anchor,
                selection.head
            );
        }

        // focus editor.current and place cursor at end if not already focused
        if (!codemirror.hasFocus()) {
            focusEditor();
            text = `\n\n${text}\n\n`;
        }

        // insert at cursor or replace selection then position cursor at end
        // of inserted text
        codemirror.replaceSelection(text, 'end');
    }

    return {openImageUploadDialog, captureSelection, uploadImages, insertUnsplashImage, imageInputRef, isImageLoading};
}
