import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useDragAndDrop from '../hooks/useDragAndDrop';
import {$createNodeSelection, $getNodeByKey, $setSelection} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ImageCard} from '../components/ui/cards/ImageCard';
import {ImageUploadForm} from '../components/ui/ImageUploadForm';
import {LinkInput} from '../components/ui/LinkInput';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {imageUploadHandler} from '../utils/imageUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ImageNodeComponent({nodeKey, initialFile, src, altText, caption, triggerFileDialog, previewSrc, href}) {
    const [editor] = useLexicalComposerContext();
    const [showLink, setShowLink] = React.useState(false);
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const {isSelected, cardWidth, setCardWidth, setCaptionHasFocus, captionHasFocus} = React.useContext(CardContext);
    const fileInputRef = React.useRef();
    const toolbarFileInputRef = React.useRef();

    const imageUploader = fileUploader.useFileUpload('image');
    const imageDragHandler = useDragAndDrop({handleDrop: handleImageDrop});

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

    async function handleImageDrop(files) {
        await imageUploadHandler(files, nodeKey, editor, imageUploader.upload);
    }

    return (
        <>
            <ImageCard
                altText={altText}
                caption={caption}
                cardWidth={cardWidth}
                fileInputRef={fileInputRef}
                imageDragHandler={imageDragHandler}
                imageUploader={imageUploader}
                isSelected={isSelected}
                previewSrc={previewSrc}
                setAltText={setAltText}
                setCaption={setCaption}
                setCaptionHasFocus={setCaptionHasFocus}
                src={src}
                onFileChange={onFileChange}
            />

            <ActionToolbar
                data-kg-card-toolbar="image"
                isVisible={showLink && !captionHasFocus}
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
                isVisible={src && isSelected && !showLink && !captionHasFocus}
            >
                <ImageUploadForm
                    fileInputRef={toolbarFileInputRef}
                    mimeTypes={fileUploader.fileTypes.image?.mimeTypes}
                    onFileChange={onFileChange}
                />
                <ToolbarMenu>
                    <ToolbarMenuItem icon="imageRegular" isActive={cardWidth === 'regular' ? true : false} label="Regular" onClick={() => handleImageCardResize('regular')} />
                    <ToolbarMenuItem icon="imageWide" isActive={cardWidth === 'wide' ? true : false} label="Wide" onClick={() => handleImageCardResize('wide')}/>
                    <ToolbarMenuItem icon="imageFull" isActive={cardWidth === 'full' ? true : false} label="Full" onClick={() => handleImageCardResize('full')} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem icon="link" isActive={href === true || false} label="Link" onClick = {() => {
                        setShowLink(true);
                    }} />
                    <ToolbarMenuItem icon="imageReplace" isActive={false} label="Replace" onClick={() => openFileSelection({fileInputRef: toolbarFileInputRef})} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem icon="snippet" isActive={false} label="Snippet" />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
