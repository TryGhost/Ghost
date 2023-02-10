import React from 'react';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {getEditorCardNodes} from '../utils/getEditorCardNodes';
import {INSERT_IMAGE_COMMAND} from '../nodes/ImageNode';
import {INSERT_AUDIO_COMMAND} from '../nodes/AudioNode';
import KoenigComposerContext from '../context/KoenigComposerContext';

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

async function getListofAcceptableMimeTypes(editor, uploadFileTypes) {
    const nodes = getEditorCardNodes(editor);
    let acceptableMimeTypes = {};
    for (const [nodeType, node] of nodes) {
        if (nodeType && node.uploadType) {
            acceptableMimeTypes[nodeType] = uploadFileTypes[node.uploadType].mimeTypes;
        }
    }
    return {
        acceptableMimeTypes
    };
}

function DragDropPastePlugin() {
    const [editor] = useLexicalComposerContext();
    const {fileUploader} = React.useContext(KoenigComposerContext);

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
    }, [handleDrop, handleDrag]);

    const handleFileUpload = React.useCallback(async (files) => {
        const {acceptableMimeTypes} = await getListofAcceptableMimeTypes(editor, fileUploader.fileTypes);
        const {processed, node} = await mediaFileReader(files, acceptableMimeTypes);
        if (processed.length) {
            if (node === 'image') {
                editor.dispatchCommand(INSERT_IMAGE_COMMAND, processed);
            } else if (node === 'audio') {
                processed.forEach((file) => {
                    editor.dispatchCommand(INSERT_AUDIO_COMMAND, {initialFile: [file]});
                });
            }
        }
    }, [editor, fileUploader.fileTypes]);

    React.useEffect(() => {
        return editor.registerCommand(
            DRAG_DROP_PASTE,
            async (files) => {
                try {
                    return await handleFileUpload(files);
                } catch (error) {
                    console.error(error); // eslint-disable-line no-console
                }
            },
            COMMAND_PRIORITY_LOW
        );
    }, [editor, handleFileUpload]);
    return null;
}

export default DragDropPastePlugin;
