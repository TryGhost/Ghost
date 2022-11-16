import React from 'react';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
// import {isMimeType, mediaFileReader} from '@lexical/utils'; // not yet available in stable version of lexical
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {getEditorCardNodes} from '../utils/getEditorCardNodes';
import {UPLOAD_IMAGE_COMMAND} from '../nodes/ImageNode';

// TODO - replace the next 2 isMimeType and mediaFileReader with  @lexical/utils library when released in next `not nightly` version of Lexical - currently not available in latest published Lexical version.
// NB added minor adjustment to mediaFileReader to adapt to existing uploaders, 
// both on Ghost and Demo - we should adapt those functions to meet Lexicals output which is an array like [{file: fileData, result: base64 String}] )
// source https://github.com/facebook/lexical/blob/main/packages/lexical-utils/src/index.ts

function isMimeType(file, acceptableMimeTypes) {
    const mimeType = file.type;
    let key = Object.keys(acceptableMimeTypes).find(k => acceptableMimeTypes[k].includes(mimeType));
    return key;
}
  
function mediaFileReader(files, acceptableMimeTypes) {
    const filesIterator = files[Symbol.iterator]();
    return new Promise((resolve, reject) => {
        const processed = [];
        let node;
        const handleNextFile = () => {
            const {done, value: file} = filesIterator.next();
            if (done) {
                return resolve({processed, node});
            }
            const fileReader = new FileReader();
            fileReader.addEventListener('error', reject);
            fileReader.addEventListener('load', () => {
                const result = fileReader.result;
                if (typeof result === 'string') {
                    processed.push(file);
                }
                handleNextFile();
            });
            const nodeType = isMimeType(file, acceptableMimeTypes);
            if (nodeType) {
                fileReader.readAsDataURL(file);
                node = nodeType;
            } else {
                console.error('unsupported file type'); // eslint-disable-line no-console
                handleNextFile();
            }
        };
        handleNextFile();
    });
}

async function getListofAcceptableMimeTypes(editor) {
    const nodes = getEditorCardNodes(editor);
    let acceptableMimeTypes = {};
    for (const [nodeType, node] of nodes) {
        if (nodeType && node.mimeTypes) {
            acceptableMimeTypes[nodeType] = node.mimeTypes;
        }
    }
    return {
        acceptableMimeTypes
    };
}

function DragDropPastePlugin() {
    const [editor] = useLexicalComposerContext();

    const handleDrag = React.useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
    }, []);

    const handleDrop = React.useCallback(async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files) {
            editor.dispatchCommand(DRAG_DROP_PASTE, e.dataTransfer.files);
        }
    }, [editor]);

    React.useEffect(() => {
        // TODO: consuming app should be able to configure the element where they want to listen to the drag and drop events
        const dropTarget = document.querySelector('.gh-koenig-editor') || document;
        dropTarget.addEventListener('dragover', handleDrag);
        dropTarget.addEventListener('drop', handleDrop);

        return () => {
            dropTarget.removeEventListener('dragover', handleDrag);
            dropTarget.removeEventListener('drop', handleDrop);
        };
    }, [handleDrag, handleDrop]);

    React.useEffect(() => {
        return editor.registerCommand(
            DRAG_DROP_PASTE,
            async (files) => {
                const {acceptableMimeTypes} = await getListofAcceptableMimeTypes(editor);
                const {processed, node} = await mediaFileReader(files, acceptableMimeTypes);
                if (processed && node) {
                    if (node === 'image') {
                        editor.dispatchCommand(UPLOAD_IMAGE_COMMAND, processed);
                    }
                }
            },
            COMMAND_PRIORITY_LOW 
        );
    }, [editor]);
    return null;
}

export default DragDropPastePlugin;
