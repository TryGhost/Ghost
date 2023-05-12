import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {FileCard} from '../components/ui/cards/FileCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {fileUploadHandler} from '../utils/fileUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function FileNodeComponent({
    fileDesc,
    fileDescPlaceholder,
    fileName,
    fileSize,
    fileTitle,
    fileTitlePlaceholder,
    fileSrc,
    nodeKey,
    triggerFileDialog,
    initialFile

}) {
    const [editor] = useLexicalComposerContext();
    const [isPopulated, setIsPopulated] = React.useState(false);
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const {isSelected, isEditing} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const uploader = fileUploader.useFileUpload('file');
    const fileDragHandler = useFileDragAndDrop({handleDrop: handleFileDrop});

    React.useEffect(() => {
        const uploadInitialFile = async (file) => {
            if (file && !fileSrc) {
                await fileUploadHandler([file], nodeKey, editor, uploader.upload);
            }
        };

        uploadInitialFile(initialFile);

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onFileChange = async (e) => {
        const files = e.target.files;

        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSrc('');
        });

        return await fileUploadHandler(files, nodeKey, editor, uploader.upload);
    };

    React.useEffect(() => {
        // it should always be populated if it has a fileSrc, fileSize and fileName
        if (fileSrc && fileSize && fileName) {
            setIsPopulated(true);
        }
    }, [fileName, fileSize, fileSrc]);

    // const onFileInputRef = (element) => {
    //     fileInputRef.current = element;
    // };

    const enableEditing = (e) => {
        e.preventDefault();
        // prevent card from propagating click event to the editor
        e.stopPropagation();
        // TODO make it go to the first input field in the card
    };

    const handleFileTitle = (e) => {
        const title = e.target.value;

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setFileTitle(title);
        });
    };

    const handleFileDesc = (e) => {
        const desc = e.target.value;

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setFileCaption(desc);
        });
    };

    // when card is inserted from the card menu or slash command we want to show the file picker immediately
    // uses a setTimeout to avoid issues with React rendering the component twice in dev mode 🙈
    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }

        const renderTimeout = setTimeout(() => {
            // trigger dialog
            openFileSelection({fileInputRef: fileInputRef});

            // clear the property on the node so we don't accidentally trigger anything with a re-render
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setTriggerFileDialog(false);
            });
        });

        return (() => {
            clearTimeout(renderTimeout);
        });

        // absolutely no idea why [openFileSelection] is needed here but not
        // in some other card's dialog trigger useEffects 🤷‍♂️
        // without it the dialog doesn't open when the card is inserted from the card menu

        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [openFileSelection]);

    async function handleFileDrop(files) {
        await fileUploadHandler(files, nodeKey, editor, uploader.upload);
    }

    return (
        <>
            <FileCard
                fileDesc={fileDesc}
                fileDescPlaceholder={fileDescPlaceholder}
                fileDragHandler={fileDragHandler}
                fileInputRef={fileInputRef}
                fileName={fileName}
                fileSize={fileSize}
                fileTitle={fileTitle}
                fileTitlePlaceholder={fileTitlePlaceholder}
                fileUploader={uploader}
                handleFileDesc={handleFileDesc}
                handleFileTitle={handleFileTitle}
                isEditing={isEditing}
                isPopulated={isPopulated}
                onFileChange={onFileChange}
            />
            <ActionToolbar
                data-kg-card-toolbar="file-upload"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="file-upload"
                isVisible={isSelected && isPopulated && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-file-upload-card" icon="edit" isActive={false} label="Edit" onClick={enableEditing} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem
                        icon="snippet"
                        isActive={false}
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export default FileNodeComponent;
