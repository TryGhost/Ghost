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

export function ImageNodeComponent({nodeKey, src, altText, caption}) {
    const [editor] = useLexicalComposerContext();
    const {editorContainerRef, imageUploader} = React.useContext(KoenigComposerContext);
    const {cardContainerRef, isSelected} = React.useContext(CardContext);
    const toolbarFileInputRef = React.useRef();

    const onFileChange = async (e) => {
        const fls = e.target.files;
        const files = await imageUploader.imageUploader(fls); // idea here is to have something like imageUploader.uploadProgressPercentage to pass to the progress bar.

        if (files) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setSrc(files.src);
            });
        }
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

    return (
        <>
            <ImageCard
                isSelected={isSelected}
                onFileChange={onFileChange}
                src={src}
                altText={altText}
                setAltText={setAltText}
                caption={caption}
                setCaption={setCaption}
            />
            <ActionToolbar
                isVisible={src && isSelected}
                containerRef={cardContainerRef}
                parentContainerRef={editorContainerRef}
                data-kg-card-toolbar="image"
            >
                <ImageUploadForm
                    onFileChange={onFileChange}
                    fileInputRef={toolbarFileInputRef}
                />
                <ToolbarMenu>
                    <ToolbarMenuItem label="Regular" icon="imageRegular" isActive={true} />
                    <ToolbarMenuItem label="Wide" icon="imageWide" isActive={false} />
                    <ToolbarMenuItem label="Full" icon="imageFull" isActive={false} />
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
