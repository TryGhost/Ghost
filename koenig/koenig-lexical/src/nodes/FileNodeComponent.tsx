import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {FileCard} from '../components/ui/cards/FileCard';
import {SHOW_CARD_VISIBILITY_SETTINGS_COMMAND} from '../plugins/KoenigBehaviourPlugin.jsx';
import {SettingsPanel} from '../components/ui/SettingsPanel.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {VisibilitySettings} from '../components/ui/VisibilitySettings.jsx';
import {fileUploadHandler} from '../utils/fileUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.jsx';

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
    const {fileUploader, cardConfig, darkMode} = React.useContext(KoenigComposerContext);
    const {isSelected, isEditing} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const {showVisibilitySettings} = useKoenigSelectedCardContext();
    const {isVisibilityEnabled, visibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

    const visibilitySettingsTabs = [
        {id: 'visibility', label: 'Visibility'}
    ];

    const handleVisibilityToggle = React.useCallback((event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(SHOW_CARD_VISIBILITY_SETTINGS_COMMAND, {cardKey: nodeKey});
    }, [editor, nodeKey]);

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
            node.src = '';
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
            node.fileTitle = title;
        });
    };

    const handleFileDesc = (e) => {
        const desc = e.target.value;

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.fileCaption = desc;
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
                node.triggerFileDialog = false;
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
                    {isVisibilityEnabled && (
                        <>
                            <ToolbarMenuSeparator />
                            <ToolbarMenuItem
                                dataTestId="show-visibility"
                                icon="visibility"
                                isActive={showVisibilitySettings}
                                label="Visibility"
                                onClick={handleVisibilityToggle}
                            />
                        </>
                    )}
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem
                        icon="snippet"
                        isActive={false}
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>

            {isVisibilityEnabled && showVisibilitySettings && isSelected && (
                <SettingsPanel
                    darkMode={darkMode}
                    defaultTab="visibility"
                    tabs={visibilitySettingsTabs}
                    onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                    }}
                >
                    {{
                        visibility: (
                            <VisibilitySettings
                                toggleVisibility={toggleVisibility}
                                visibilityOptions={visibilityOptions}
                            />
                        )
                    }}
                </SettingsPanel>
            )}
        </>
    );
}

export default FileNodeComponent;
