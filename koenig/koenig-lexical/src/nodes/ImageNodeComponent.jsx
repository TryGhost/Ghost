import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import usePinturaEditor from '../hooks/usePinturaEditor';
import {$createNodeSelection, $getNodeByKey, $setSelection} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ImageCard} from '../components/ui/cards/ImageCard';
import {ImageUploadForm} from '../components/ui/ImageUploadForm';
import {LinkInput} from '../components/ui/LinkInput';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {dataSrcToFile} from '../utils/dataSrcToFile.js';
import {imageUploadHandler} from '../utils/imageUploadHandler';
import {isGif} from '../utils/isGif';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ImageNodeComponent({nodeKey, initialFile, src, altText, captionEditor, captionEditorInitialState, triggerFileDialog, previewSrc, href}) {
    const [editor] = useLexicalComposerContext();
    const [showLink, setShowLink] = React.useState(false);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected, cardWidth, setCardWidth} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const toolbarFileInputRef = React.useRef();
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const imageUploader = fileUploader.useFileUpload('image');
    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageDrop});
    const {isEnabled: isPinturaEnabled, openEditor: openImageEditor} = usePinturaEditor({config: cardConfig.pinturaConfig});

    React.useEffect(() => {
        if (!src?.startsWith('data:') || imageUploader.isLoading) {
            return;
        }

        let isMounted = true;

        // When copy/pasting from Google Docs it's possible for images to be transferred with data: URLs.
        // Convert `data:` URL to File and upload it
        const uploadFile = async () => {
            const file = await dataSrcToFile(src);
            if (isMounted) {
                await imageUploadHandler([file], nodeKey, editor, imageUploader.upload);
            }
        };

        uploadFile();

        return () => isMounted = false;
    }, [editor, imageUploader.isLoading, imageUploader.upload, nodeKey, src]);

    React.useEffect(() => {
        const uploadInitialFile = async (file) => {
            if (file && !src) {
                await imageUploadHandler([file], nodeKey, editor, imageUploader.upload);
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

        return await imageUploadHandler(files, nodeKey, editor, imageUploader.upload);
    };

    const setHref = (newHref) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setHref(newHref);
        });
    };

    const setAltText = (newAltText) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setAltText(newAltText);
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
            openFileSelection({fileInputRef});

            // clear the property on the node so we don't accidentally trigger anything with a re-render
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setTriggerFileDialog(false);
            });
        });

        return (() => {
            clearTimeout(renderTimeout);
        });
    });

    const handleImageCardResize = (newWidth) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCardWidth(newWidth); // this is a property on the node, not the card
            setCardWidth(newWidth); // sets the state of the toolbar component
        });
    };

    const cancelLinkAndReselect = () => {
        setShowLink(false);
        reselectImageCard();
    };

    const reselectImageCard = () => {
        editor.update(() => {
            const nodeSelection = $createNodeSelection();
            nodeSelection.add(nodeKey);
            $setSelection(nodeSelection);
        });
    };

    async function handleImageDrop(files) {
        await imageUploadHandler(files, nodeKey, editor, imageUploader.upload);
    }

    return (
        <>
            <ImageCard
                altText={altText}
                captionEditor={captionEditor}
                captionEditorInitialState={captionEditorInitialState}
                cardWidth={cardWidth}
                fileInputRef={fileInputRef}
                imageDragHandler={imageDragHandler}
                imageUploader={imageUploader}
                isSelected={isSelected}
                previewSrc={previewSrc}
                setAltText={setAltText}
                src={src}
                onFileChange={onFileChange}
            />

            <ActionToolbar
                data-kg-card-toolbar="image"
                isVisible={showLink}
            >
                <LinkInput
                    cancel={cancelLinkAndReselect}
                    href={href}
                    update={(_href) => {
                        setHref(_href);
                        cancelLinkAndReselect();
                    }}
                />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="image"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="image"
                isVisible={src && isSelected && !showLink && !showSnippetToolbar}
            >
                <ImageUploadForm
                    fileInputRef={toolbarFileInputRef}
                    mimeTypes={fileUploader.fileTypes.image?.mimeTypes}
                    onFileChange={onFileChange}
                />
                <ToolbarMenu>
                    <ToolbarMenuItem
                        hide={isGif(src)}
                        icon="imgRegular"
                        isActive={cardWidth === 'regular'}
                        label="Regular"
                        onClick={() => handleImageCardResize('regular')}
                    />
                    <ToolbarMenuItem
                        hide={isGif(src)}
                        icon="imgWide"
                        isActive={cardWidth === 'wide'}
                        label="Wide"
                        onClick={() => handleImageCardResize('wide')}
                    />
                    <ToolbarMenuItem
                        hide={isGif(src)}
                        icon="imgFull"
                        isActive={cardWidth === 'full'}
                        label="Full"
                        onClick={() => handleImageCardResize('full')}
                    />
                    <ToolbarMenuSeparator hide={isGif(src)} />
                    <ToolbarMenuItem icon="link" isActive={href === true || false} label="Link" onClick = {() => {
                        setShowLink(true);
                    }} />
                    <ToolbarMenuItem
                        hide={isGif(src)}
                        icon="imgReplace"
                        isActive={false}
                        label="Replace"
                        onClick={() => openFileSelection({fileInputRef: toolbarFileInputRef})}
                    />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
                        icon="snippet"
                        isActive={false}
                        label="Snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                    <ToolbarMenuSeparator hide={!isPinturaEnabled} />
                    <ToolbarMenuItem
                        hide={!isPinturaEnabled}
                        icon="edit"
                        isActive={false}
                        label="Edit"
                        onClick={() => openImageEditor({
                            image: src,
                            handleSave: (editedImage) => {
                                onFileChange({
                                    target: {
                                        files: [editedImage]
                                    }
                                });
                            }
                        })}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
