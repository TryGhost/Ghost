import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SignupCard} from '../components/ui/cards/SignupCard.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../utils/imageUploadHandler';
import {useContext, useEffect, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function SignupNodeComponent({
    backgroundImageSrc,
    button,
    buttonPlaceholder,
    buttonText,
    nodeKey,
    disclaimer,
    disclaimerPlaceholder,
    disclaimerTextEditor,
    disclaimerTextEditorInitialState,
    header,
    headerPlaceholder,
    headerTextEditor,
    headerTextEditorInitialState,
    subheader,
    subheaderPlaceholder,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    type
}) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = useContext(KoenigComposerContext);
    const {fileUploader} = useContext(KoenigComposerContext);
    const {isEditing, isSelected} = useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);

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

    const [backgroundImagePreview, setBackgroundImagePreview] = useState(false);

    const fileInputRef = useRef(null);

    const openFilePicker = () => {
        fileInputRef.current.click();
    };

    const toggleBackgroundImagePreview = () => {
        setBackgroundImagePreview(!backgroundImagePreview);
    };

    useEffect(() => {
        if (backgroundImageSrc !== '') {
            setBackgroundImagePreview(true);
        }
    }, [backgroundImageSrc]);

    const handleColorSelector = (color) => {
        color === 'image' ? setBackgroundImagePreview(true) : setBackgroundImagePreview(false);

        if (color === 'image' && backgroundImageSrc === ''){
            openFilePicker();
        }
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setStyle(color);
        });
    };

    const handleSizeSelector = (s) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setSize(s);
        });
    };

    const handleButtonText = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonText(event.target.value);
        });
    };

    const handleClearBackgroundImage = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundImageSrc('');
        });
    };

    useEffect(() => {
        headerTextEditor.setEditable(isEditing);
        subheaderTextEditor.setEditable(isEditing);
    }, [isEditing, headerTextEditor, subheaderTextEditor]);
    return (
        <>
            <SignupCard
                backgroundImagePreview={backgroundImagePreview}
                backgroundImageSrc={backgroundImageSrc}
                buttonPlaceholder={buttonPlaceholder}
                buttonText={buttonText}
                disclaimer={disclaimer}
                disclaimerPlaceholder={disclaimerPlaceholder}
                disclaimerTextEditor={disclaimerTextEditor}
                disclaimerTextEditorInitialState={disclaimerTextEditorInitialState}
                fileInputRef={fileInputRef}
                fileUploader={imageUploader}
                handleButtonText={handleButtonText}
                handleClearBackgroundImage={handleClearBackgroundImage}
                handleColorSelector={handleColorSelector}
                handleSizeSelector={handleSizeSelector}
                header={header}
                headerPlaceholder={headerPlaceholder}
                headerTextEditor={headerTextEditor}
                headerTextEditorInitialState={headerTextEditorInitialState}
                isEditing={isEditing}
                openFilePicker={openFilePicker}
                subheader={subheader}
                subheaderPlaceholder={subheaderPlaceholder}
                subheaderTextEditor={subheaderTextEditor}
                subheaderTextEditorInitialState={subheaderTextEditorInitialState}
                toggleBackgroundImagePreview={toggleBackgroundImagePreview}
                type={type}
                onFileChange={onFileChange}
            />
            <ActionToolbar
                data-kg-card-toolbar="signup"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="signup"
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

export default SignupNodeComponent;
