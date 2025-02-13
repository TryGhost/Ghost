import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React, {useRef} from 'react';
import {$createNodeSelection, $getNodeByKey, $setSelection} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {CallToActionCard} from '../components/ui/cards/CallToActionCard.jsx';
import {LinkInput} from '../components/ui/LinkInput';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {getImageDimensions} from '../utils/getImageDimensions';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle.js';

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
    buttonTextColor,
    href,
    sponsorLabelHtmlEditor,
    sponsorLabelHtmlEditorInitialState
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const [showLink, setShowLink] = React.useState(false);

    const {visibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

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
        const imgPreviewUrl = URL.createObjectURL(files[0]);
        const {width, height} = await getImageDimensions(imgPreviewUrl);
        const result = await imageUploader.upload(files);
        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.imageUrl = result?.[0].url;
            node.hasImage = true;
            node.imageWidth = width;
            node.imageHeight = height;
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

    const reselectCallToActionCard = () => {
        editor.update(() => {
            const nodeSelection = $createNodeSelection();
            nodeSelection.add(nodeKey);
            $setSelection(nodeSelection);
        });
    };

    const cancelLinkAndReselect = () => {
        setShowLink(false);
        reselectCallToActionCard();
    };

    const setHref = (newHref) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.href = newHref;
        });
    };

    React.useEffect(() => {
        htmlEditor.setEditable(isEditing);
    }, [isEditing, htmlEditor]);

    return (
        <>
            <CallToActionCard
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
                layout={layout}
                setEditing={setEditing}
                setFileInputRef={ref => fileInputRef.current = ref}
                showButton={showButton}
                sponsorLabelHtmlEditor={sponsorLabelHtmlEditor}
                sponsorLabelHtmlEditorInitialState={sponsorLabelHtmlEditorInitialState}
                text={textValue}
                toggleVisibility={toggleVisibility}
                updateButtonText={handleButtonTextChange}
                updateButtonUrl={handleButtonUrlChange}
                updateHasSponsorLabel={handleHasSponsorLabelChange}
                updateLayout={handleUpdatingLayout}
                updateShowButton={toggleShowButton}
                visibilityOptions={visibilityOptions}
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
                data-kg-card-toolbar="link"
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
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing && !showSnippetToolbar && !showLink}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem dataTestId="edit-button-card" icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
                    <ToolbarMenuSeparator />
                    <ToolbarMenuItem icon="link" isActive={href || false} label="Link" onClick = {() => {
                        setShowLink(true);
                    }} />
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
