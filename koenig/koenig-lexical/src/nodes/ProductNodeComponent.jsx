import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useDragAndDrop from '../hooks/useDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {ProductCard} from '../components/ui/cards/ProductCard';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
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
    titleEditor,
    descriptionEditor
}) {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const imgMimeTypes = fileUploader.fileTypes.image?.mimeTypes || ['image/*'];
    const imgDragHandler = useDragAndDrop({handleDrop: handleImgDrop, disabled: !isEditing});
    const imgUploader = fileUploader.useFileUpload('image');
    const [imgPreview, setImgPreview] = React.useState('');

    React.useEffect(() => {
        titleEditor.setEditable(isEditing);
        descriptionEditor.setEditable(isEditing);
    }, [isEditing, titleEditor, descriptionEditor]);

    const handleImgUpload = async (files) => {
        const imgPreviewUrl = URL.createObjectURL(files[0]);
        setImgPreview(imgPreviewUrl);

        const imgUploadResult = await imgUploader.upload(files);
        const imageUrl = imgUploadResult?.[0]?.url;

        if (imageUrl) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.setImgSrc(imageUrl);
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

    const handleButtonUrlChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(event.target.value);
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
                descriptionEditor={descriptionEditor}
                imgDragHandler={imgDragHandler}
                imgHeight={imgHeight}
                imgMimeTypes={imgMimeTypes}
                imgSrc={imgPreview || imgSrc}
                imgUploader={imgUploader}
                imgWidth={imgWidth}
                isButtonEnabled={isButtonEnabled}
                isEditing={isEditing}
                isRatingEnabled={isRatingEnabled}
                rating={starRating}
                titleEditor={titleEditor}
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
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-product-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem icon="snippet" isActive={false} label="Snippet" />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
