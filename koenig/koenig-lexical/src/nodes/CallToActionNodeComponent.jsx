import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
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
    hasBackground,
    hasImage,
    hasSponsorLabel,
    imageUrl,
    layout,
    showButton,
    textValue,
    buttonColor,
    htmlEditor,
    buttonTextColor
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

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

    const handleUpdatingLayout = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.layout = val;
        });
    };

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
                hasBackground={hasBackground}
                hasImage={hasImage}
                hasSponsorLabel={hasSponsorLabel}
                htmlEditor={htmlEditor}
                imageSrc={imageUrl}
                isEditing={isEditing}
                isSelected={isSelected}
                layout={layout}
                setEditing={setEditing}
                showButton={showButton}
                text={textValue}
                updateButtonText={handleButtonTextChange}
                updateButtonUrl={handleButtonUrlChange}
                updateHasSponsorLabel={handleHasSponsorLabelChange}
                updateLayout={handleUpdatingLayout}
                updateShowButton={toggleShowButton}
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
