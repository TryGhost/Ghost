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
import {getImageDimensions} from '../utils/getImageDimensions';

export function ImageNodeComponent({nodeKey, src, altText, caption, triggerFileDialog}) {
    const [editor] = useLexicalComposerContext();
    const [dragOver, setDragOver] = React.useState(false);
    const {imageUploader} = React.useContext(KoenigComposerContext);
    const {isSelected, cardWidth, setCardWidth} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const toolbarFileInputRef = React.useRef();

    // Removed the editor update from the onFileChange function so that we can reuse it when adding the Link toolbar button.
    const updateImageNode = async ({fileSrc, file}) => {
        if (!fileSrc) {
            return;
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSrc(fileSrc);
        });
        if (file) {
            let url = URL.createObjectURL(file);
            const {width, height} = await getImageDimensions(url);
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setImgWidth(width);
                node.setImgHeight(height);
            });
        }
    };

    const onFileChange = async (e) => {
        const fls = e.target.files;

        const files = await imageUploader.imageUploader(fls); // idea here is to have something like imageUploader.uploadProgressPercentage to pass to the progress bar.
        if (files) {
            updateImageNode({fileSrc: files.src, file: fls[0]});
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
            const files = await imageUploader.imageUploader(e.dataTransfer.files);
            if (files) {
                editor.update(() => {
                    const node = $getNodeByKey(nodeKey);
                    node.setSrc(files.src);
                });
                setDragOver(false);
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
