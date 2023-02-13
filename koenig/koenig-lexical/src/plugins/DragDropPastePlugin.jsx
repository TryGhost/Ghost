import React from 'react';
import {DRAG_DROP_PASTE} from '@lexical/rich-text';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {COMMAND_PRIORITY_LOW} from 'lexical';
import {getEditorCardNodes} from '../utils/getEditorCardNodes';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {createCommand} from 'lexical';

export const INSERT_MEDIA_COMMAND = createCommand();

function isMimeType(file, acceptableMimeTypes) {
    const mimeType = file.type;
    let key = Object.keys(acceptableMimeTypes).find(k => acceptableMimeTypes[k].includes(mimeType));
    return key;
}

function mediaFileReader(files, acceptableMimeTypes) {
    const filesIterator = files[Symbol.iterator]();
    return new Promise((resolve, reject) => {
        const processed = [];
        const handleNextFile = () => {
            const {done, value: file} = filesIterator.next();
            if (done) {
                return resolve({processed});
            }
            const fileReader = new FileReader();
            fileReader.addEventListener('error', reject);
            fileReader.addEventListener('load', () => {
                const result = fileReader.result;
                const nodeType = isMimeType(file, acceptableMimeTypes);
                if (typeof result === 'string') {
                    processed.push({type: nodeType, file: file});
                }
                handleNextFile();
            });
            const nodeType = isMimeType(file, acceptableMimeTypes);
            if (nodeType) {
                fileReader.readAsDataURL(file);
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

    const handleFileUpload = React.useCallback(async (files) => {
        const {acceptableMimeTypes} = await getListofAcceptableMimeTypes(editor, fileUploader.fileTypes);
        const {processed} = await mediaFileReader(files, acceptableMimeTypes);
        processed.forEach((item) => {
            editor.dispatchCommand(INSERT_MEDIA_COMMAND, item);
        });
    }, [editor, fileUploader.fileTypes]);

    React.useEffect(() => {
        return editor.registerCommand(
            DRAG_DROP_PASTE,
            async (files) => {
                try {
                    editor.focus();
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
