import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import usePinturaEditor from '../hooks/usePinturaEditor';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {ProductCard} from '../components/ui/cards/ProductCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {getImageDimensions} from '../utils/getImageDimensions';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export function ProductNodeComponent({
    nodeKey,
    buttonText,
    buttonUrl,
    imgHeight,
    imgSrc,
    imgWidth,
    isButtonEnabled,
    isRatingEnabled,
    starRating,
    title,
    titleEditor,
    titleEditorInitialState,
    descriptionEditor,
    descriptionEditorInitialState,
    description
}) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const imgMimeTypes = fileUploader.fileTypes.image?.mimeTypes || ['image/*'];
    const {isEnabled: isPinturaEnabled, openEditor: openImageEditor} = usePinturaEditor({config: cardConfig.pinturaConfig});
    const imgDragHandler = useFileDragAndDrop({handleDrop: handleImgDrop, disabled: !isEditing});
    const imgUploader = fileUploader.useFileUpload('image');
    const [imgPreview, setImgPreview] = React.useState('');
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    React.useEffect(() => {
        titleEditor.setEditable(isEditing);
        descriptionEditor.setEditable(isEditing);
    }, [isEditing, titleEditor, descriptionEditor]);

    const handleImgUpload = async (files) => {
        const imgPreviewUrl = URL.createObjectURL(files[0]);
        setImgPreview(imgPreviewUrl);

        const {width, height} = await getImageDimensions(imgPreviewUrl);
        const imgUploadResult = await imgUploader.upload(files);
        const imageUrl = imgUploadResult?.[0]?.url;

        if (imageUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setImgSrc(imageUrl);
                node.setImgHeight(height);
                node.setImgWidth(width);
            });
        }

        setImgPreview('');
        URL.revokeObjectURL(imgPreviewUrl);
    };

    const handleImgChange = async (e) => {
        const file = e.target.files[0];
        if (!file) {
            return;
        }
        await handleImgUpload(e.target.files);
    };

    const onRemoveImage = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setImgSrc('');
        });
    };

    async function handleImgDrop(files) {
        await handleImgUpload(files);
    }

    const handleButtonToggle = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setIsButtonEnabled(event.target.checked);
        });
    };

    const handleButtonTextChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonText(event.target.value);
        });
    };

    const handleButtonUrlChange = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(val);
        });
    };

    const handleRatingToggle = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setIsRatingEnabled(event.target.checked);
        });
    };

    const handleRatingChange = (rating) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setStarRating(rating);
        });
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    return (
        <>
            <ProductCard
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                description={description}
                descriptionEditor={descriptionEditor}
                descriptionEditorInitialState={descriptionEditorInitialState}
                imgDragHandler={imgDragHandler}
                imgHeight={imgHeight}
                imgMimeTypes={imgMimeTypes}
                imgSrc={imgPreview || imgSrc}
                imgUploader={imgUploader}
                imgWidth={imgWidth}
                isButtonEnabled={isButtonEnabled}
                isEditing={isEditing}
                isPinturaEnabled={isPinturaEnabled}
                isRatingEnabled={isRatingEnabled}
                openImageEditor={openImageEditor}
                rating={starRating}
                title={title}
                titleEditor={titleEditor}
                titleEditorInitialState={titleEditorInitialState}
                onButtonTextChange={handleButtonTextChange}
                onButtonToggle={handleButtonToggle}
                onButtonUrlChange={handleButtonUrlChange}
                onImgChange={handleImgChange}
                onRatingChange={handleRatingChange}
                onRatingToggle={handleRatingToggle}
                onRemoveImage={onRemoveImage}
            />

            <ActionToolbar
                data-kg-card-toolbar="product"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="product"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-product-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator hide={!cardConfig.createSnippet} />
                    <ToolbarMenuItem
                        dataTestId="create-snippet"
                        hide={!cardConfig.createSnippet}
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
