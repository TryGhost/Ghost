import React from 'react';
import {$getNodeByKey} from 'lexical';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {ImageCard} from '../components/ui/cards/ImageCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ImageUploadForm} from '../components/ui/ImageUploadForm';
import {openFileSelection} from '../utils/openFileSelection';
import {imageUploadHandler} from '../utils/imageUploadHandler';

export function ImageNodeComponent({nodeKey, src, altText, caption, triggerFileDialog, previewSrc}) {
    const [editor] = useLexicalComposerContext();
    const [dragOver, setDragOver] = React.useState(false);
    const {imageUploader} = React.useContext(KoenigComposerContext);
    const {isSelected, cardWidth, setCardWidth} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const toolbarFileInputRef = React.useRef();

    const onFileChange = async (e) => {
        const fls = e.target.files;
        return await imageUploadHandler(fls, nodeKey, editor, imageUploader);
    };

    const setCaption = (newCaption) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setCaption(newCaption);
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
                await imageUploadHandler(fls, nodeKey, editor, imageUploader);
            }
        }
    };

    const uploadProgress = imageUploader?.uploadProgress || 0;

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
                uploadProgress={uploadProgress}
            />
            <ActionToolbar
                isVisible={src && isSelected}
                data-kg-card-toolbar="image"
            >
                <ImageUploadForm
                    onFileChange={onFileChange}
                    fileInputRef={toolbarFileInputRef}
                />
                <ToolbarMenu>
                    <ToolbarMenuItem label="Regular" icon="imageRegular" isActive={cardWidth === 'regular' ? true : false} onClick={() => handleImageCardResize('regular')} />
                    <ToolbarMenuItem label="Wide" icon="imageWide" isActive={cardWidth === 'wide' ? true : false} onClick={() => handleImageCardResize('wide')}/>
                    <ToolbarMenuItem label="Full" icon="imageFull" isActive={cardWidth === 'full' ? true : false} onClick={() => handleImageCardResize('full')} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem label="Link" icon="link" isActive={false} />
                    <ToolbarMenuItem label="Replace" icon="imageReplace" isActive={false} onClick={() => openFileSelection({fileInputRef: toolbarFileInputRef})} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem label="Snippet" icon="snippet" isActive={false} />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
