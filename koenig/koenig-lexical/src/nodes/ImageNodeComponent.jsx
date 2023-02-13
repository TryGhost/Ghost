import React from 'react';
import {$createNodeSelection, $getNodeByKey, $setSelection} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {ImageCard} from '../components/ui/cards/ImageCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ImageUploadForm} from '../components/ui/ImageUploadForm';
import {openFileSelection} from '../utils/openFileSelection';
import {imageUploadHandler} from '../utils/imageUploadHandler';
import {LinkInput} from '../components/ui/LinkInput';

export function ImageNodeComponent({nodeKey, initialFile, src, altText, caption, triggerFileDialog, previewSrc, href}) {
    const [editor] = useLexicalComposerContext();
    const [dragOver, setDragOver] = React.useState(false);
    const [showLink, setShowLink] = React.useState(false);
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const {isSelected, cardWidth, setCardWidth} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const toolbarFileInputRef = React.useRef();

    const imageUploader = fileUploader.useFileUpload('image');

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

    const setCaption = (newCaption) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCaption(newCaption);
        });
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

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragOver(true);
        } else if (e.type === 'dragleave') {
            setDragOver(false);
        }
        return;
    };

    const handleDrop = async (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const fls = e.dataTransfer.files;
            if (fls) {
                setDragOver(false);
                await imageUploadHandler(fls, nodeKey, editor, imageUploader.upload);
            }
        }
    };

    return (
        <>
            <ImageCard
                isSelected={isSelected}
                fileInputRef={fileInputRef}
                onFileChange={onFileChange}
                src={src}
                altText={altText}
                setAltText={setAltText}
                caption={caption}
                setCaption={setCaption}
                handleDrag={handleDrag}
                handleDrop={handleDrop}
                isDraggedOver={dragOver}
                cardWidth={cardWidth}
                previewSrc={previewSrc}
                imageUploader={imageUploader}
            />

            <ActionToolbar
                isVisible={showLink}
                data-kg-card-toolbar="image"
            >
                <LinkInput
                    update={(_href) => {
                        setHref(_href);
                        cancelLinkAndReselect();
                    }}
                    href={href}
                    cancel={cancelLinkAndReselect}
                />
            </ActionToolbar>

            <ActionToolbar
                isVisible={src && isSelected && !showLink}
                data-kg-card-toolbar="image"
            >
                <ImageUploadForm
                    onFileChange={onFileChange}
                    fileInputRef={toolbarFileInputRef}
                    mimeTypes={fileUploader.fileTypes.image?.mimeTypes}
                />
                <ToolbarMenu>
                    <ToolbarMenuItem label="Regular" icon="imageRegular" isActive={cardWidth === 'regular' ? true : false} onClick={() => handleImageCardResize('regular')} />
                    <ToolbarMenuItem label="Wide" icon="imageWide" isActive={cardWidth === 'wide' ? true : false} onClick={() => handleImageCardResize('wide')}/>
                    <ToolbarMenuItem label="Full" icon="imageFull" isActive={cardWidth === 'full' ? true : false} onClick={() => handleImageCardResize('full')} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem label="Link" icon="link" isActive={href === true || false} onClick = {() => {
                        setShowLink(true);
                    }} />
                    <ToolbarMenuItem label="Replace" icon="imageReplace" isActive={false} onClick={() => openFileSelection({fileInputRef: toolbarFileInputRef})} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem label="Snippet" icon="snippet" isActive={false} />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
