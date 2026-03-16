import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import usePinturaEditor from '../hooks/usePinturaEditor';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {ProductCard} from '../components/ui/cards/ProductCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {getImageDimensions} from '../utils/getImageDimensions';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LexicalEditor} from 'lexical';
import type {ProductNode} from './ProductNode';

function $getProductNodeByKey(nodeKey: string): ProductNode | null {
    return $getNodeByKey(nodeKey) as ProductNode | null;
}

interface ProductNodeComponentProps {
    nodeKey: string;
    buttonText: string;
    buttonUrl: string;
    imgHeight: number | null;
    imgSrc: string;
    imgWidth: number | null;
    isButtonEnabled: boolean;
    isRatingEnabled: boolean;
    starRating: number;
    title: string;
    titleEditor: LexicalEditor;
    titleEditorInitialState: string | undefined;
    descriptionEditor: LexicalEditor;
    descriptionEditorInitialState: string | undefined;
    description: string;
}

export function ProductNodeComponent({
    nodeKey,
    buttonText,
    buttonUrl,
    imgHeight: _imgHeight,
    imgSrc,
    imgWidth: _imgWidth,
    isButtonEnabled,
    isRatingEnabled,
    starRating,
    title: _title,
    titleEditor,
    titleEditorInitialState,
    descriptionEditor,
    descriptionEditorInitialState,
    description: _description
}: ProductNodeComponentProps) {
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

    const handleImgUpload = async (files: File[] | FileList) => {
        const imgPreviewUrl = URL.createObjectURL(files[0]);
        setImgPreview(imgPreviewUrl);

        const {width, height} = await getImageDimensions(imgPreviewUrl);
        const imgUploadResult = await imgUploader.upload(Array.from(files));
        const imageUrl = imgUploadResult?.[0]?.url;

        if (imageUrl) {
            editor.update(() => {
                const node = $getProductNodeByKey(nodeKey);
                if (!node) {return;}
                node.productImageSrc = imageUrl;
                node.productImageHeight = height;
                node.productImageWidth = width;
            });
        }

        setImgPreview('');
        URL.revokeObjectURL(imgPreviewUrl);
    };

    const handleImgChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) {
            return;
        }
        await handleImgUpload(e.target.files!);
    };

    const onRemoveImage = () => {
        editor.update(() => {
            const node = $getProductNodeByKey(nodeKey);
            if (!node) {return;}
            node.productImageSrc = '';
        });
    };

    async function handleImgDrop(files: File[]) {
        await handleImgUpload(files);
    }

    const handleButtonToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getProductNodeByKey(nodeKey);
            if (!node) {return;}
            node.productButtonEnabled = event.target.checked;
        });
    };

    const handleButtonTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getProductNodeByKey(nodeKey);
            if (!node) {return;}
            node.productButton = event.target.value;
        });
    };

    const handleButtonUrlChange = (val: string) => {
        editor.update(() => {
            const node = $getProductNodeByKey(nodeKey);
            if (!node) {return;}
            node.productUrl = val;
        });
    };

    const handleRatingToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getProductNodeByKey(nodeKey);
            if (!node) {return;}
            node.productRatingEnabled = event.target.checked;
        });
    };

    const handleRatingChange = (rating: number) => {
        editor.update(() => {
            const node = $getProductNodeByKey(nodeKey);
            if (!node) {return;}
            node.productStarRating = rating;
        });
    };

    const handleToolbarEdit = (event: React.MouseEvent) => {
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
                descriptionEditorInitialState={descriptionEditorInitialState}
                imgDragHandler={imgDragHandler}
                imgMimeTypes={imgMimeTypes}
                imgSrc={imgPreview || imgSrc}
                imgUploader={imgUploader}
                isButtonEnabled={isButtonEnabled}
                isEditing={isEditing}
                isPinturaEnabled={isPinturaEnabled}
                isRatingEnabled={isRatingEnabled}
                openImageEditor={openImageEditor}
                rating={starRating}
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
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}
