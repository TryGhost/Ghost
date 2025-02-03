import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React, {useRef} from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CtaCard} from '../components/ui/cards/CtaCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const CallToActionNodeComponent = ({
    nodeKey,
    backgroundColor,
    buttonText,
    buttonUrl,
    hasImage,
    hasSponsorLabel,
    imageUrl,
    layout,
    showButton,
    textValue,
    buttonColor,
    htmlEditor,
    htmlEditorInitialState,
    buttonTextColor
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const fileInputRef = useRef(null);

    const imageUploader = fileUploader.useFileUpload('image');

    const toggleShowButton = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.showButton = !node.showButton;
        });
    };

    const handleButtonTextChange = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonText = event.target.value;
        });
    };

    const handleButtonUrlChange = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonUrl = val;
        });
    };

    const handleButtonColorChange = (val, matchingTextColor) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonColor = val;
            node.buttonTextColor = matchingTextColor;
        });
    };
    const handleHasSponsorLabelChange = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            // get the current value and toggle it
            node.hasSponsorLabel = !node.hasSponsorLabel;
        });
    };

    const handleBackgroundColorChange = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundColor = val;
        });
    };

    const handleImageChange = async (files) => {
        const result = await imageUploader.upload(files);
        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.imageUrl = result?.[0].url;
            node.hasImage = true;
        });
    };

    const onFileChange = async (e) => {
        handleImageChange(e.target.files);
    };

    const onRemoveMedia = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.imageUrl = '';
            node.hasImage = false;
        });
    };
    const handleUpdatingLayout = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.layout = val;
        });
    };

    React.useEffect(() => {
        htmlEditor.setEditable(isEditing);
    }, [isEditing, htmlEditor]);

    return (
        <>
            <CtaCard
                buttonColor={buttonColor}
                buttonText={buttonText}
                buttonTextColor={buttonTextColor}
                buttonUrl={buttonUrl}
                color={backgroundColor}
                handleButtonColor={handleButtonColorChange}
                handleColorChange={handleBackgroundColorChange}
                hasImage={hasImage}
                hasSponsorLabel={hasSponsorLabel}
                htmlEditor={htmlEditor}
                htmlEditorInitialState={htmlEditorInitialState}
                imageSrc={imageUrl}
                imageUploader={imageUploader}
                isEditing={isEditing}
                isSelected={isSelected}
                layout={layout}
                setEditing={setEditing}
                setFileInputRef={ref => fileInputRef.current = ref}
                showButton={showButton}
                text={textValue}
                updateButtonText={handleButtonTextChange}
                updateButtonUrl={handleButtonUrlChange}
                updateHasSponsorLabel={handleHasSponsorLabelChange}
                updateLayout={handleUpdatingLayout}
                updateShowButton={toggleShowButton}
                onFileChange={onFileChange}
                onRemoveMedia={onRemoveMedia}
            />

            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-button-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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
};
