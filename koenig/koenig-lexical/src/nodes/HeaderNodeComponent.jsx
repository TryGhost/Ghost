import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {HeaderCard} from '../components/ui/cards/HeaderCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../utils/imageUploadHandler';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function HeaderNodeComponent({
    nodeKey,
    backgroundImageSrc,
    button,
    subheaderTextEditorInitialState,
    buttonPlaceholder,
    subheaderPlaceholder,
    buttonText,
    buttonUrl,
    backgroundImageStyle,
    backgroundColor,
    headerTextEditorInitialState,
    headerPlaceholder,
    header,
    subheader,
    headerTextEditor,
    subheaderTextEditor,
    size
}) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const {isEditing, setEditing, isSelected} = React.useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    const imageUploader = fileUploader.useFileUpload('image');

    const onFileChange = async (e) => {
        const files = e.target.files;

        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundImageSrc('');
        });

        const {imageSrc} = await backgroundImageUploadHandler(files, imageUploader.upload);

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundImageSrc(imageSrc);
        });
    };

    const [backgroundImagePreview, setBackgroundImagePreview] = React.useState(false);

    const fileInputRef = React.useRef(null);

    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    const toggleBackgroundImagePreview = () => {
        setBackgroundImagePreview(!backgroundImagePreview);
    };

    React.useEffect(() => {
        if (backgroundImageSrc !== '') {
            setBackgroundImagePreview(true);
        }
    }, [backgroundImageSrc]);

    const handleColorSelector = (color) => {
        color === 'bg-image' ? setBackgroundImagePreview(true) : setBackgroundImagePreview(false);

        if (color === 'bg-image' && backgroundImageSrc === ''){
            openFilePicker();
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundImageStyle(color);
        });
    };

    const handleSizeSelector = (s) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSize(s);
        });
    };

    const handleButtonToggle = (event) => {
        event.stopPropagation();
        setEditing(true); // kinda weird but this avoids the card from unselecting itself when toggling.
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonEnabled(event.target.checked);
        });
    };

    const handleButtonText = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonText(event.target.value);
        });
    };

    const handleButtonUrl = (val) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonUrl(val);
        });
    };

    const handleClearBackgroundImage = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundImageSrc('');
        });
    };

    React.useEffect(() => {
        headerTextEditor.setEditable(isEditing);
        subheaderTextEditor.setEditable(isEditing);
    }, [isEditing, headerTextEditor, subheaderTextEditor]);
    return (
        <>
            <HeaderCard
                backgroundColor={backgroundColor}
                backgroundImagePreview={backgroundImagePreview}
                backgroundImageSrc={backgroundImageSrc}
                backgroundImageStyle={backgroundImageStyle}
                button={button}
                buttonPlaceholder={buttonPlaceholder}
                buttonText={buttonText}
                buttonUrl={buttonUrl}
                fileInputRef={fileInputRef}
                fileUploader={imageUploader}
                handleButtonText={handleButtonText}
                handleButtonToggle={handleButtonToggle}
                handleButtonUrl={handleButtonUrl}
                handleClearBackgroundImage={handleClearBackgroundImage}
                handleColorSelector={handleColorSelector}
                handleSizeSelector={handleSizeSelector}
                header={header}
                headerPlaceholder={headerPlaceholder}
                headerTextEditor={headerTextEditor}
                headerTextEditorInitialState={headerTextEditorInitialState}
                isEditing={isEditing}
                openFilePicker={openFilePicker}
                size={size}
                subheader={subheader}
                subheaderPlaceholder={subheaderPlaceholder}
                subheaderTextEditor={subheaderTextEditor}
                subheaderTextEditorInitialState={subheaderTextEditorInitialState}
                toggleBackgroundImagePreview={toggleBackgroundImagePreview}
                onFileChange={onFileChange}
            />
            <ActionToolbar
                data-kg-card-toolbar="header"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="header"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem icon="edit" isActive={false} label="Edit" onClick={handleToolbarEdit} />
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

export default HeaderNodeComponent;
