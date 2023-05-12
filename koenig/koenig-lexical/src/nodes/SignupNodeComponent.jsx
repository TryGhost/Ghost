import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SignupCard} from '../components/ui/cards/SignupCard.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../utils/imageUploadHandler';
import {useContext, useEffect, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function SignupNodeComponent({
    backgroundImageSrc,
    backgroundColor,
    buttonPlaceholder,
    buttonText,
    buttonColor,
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
    labels
}) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = useContext(KoenigComposerContext);
    const {fileUploader} = useContext(KoenigComposerContext);
    const {isEditing, isSelected} = useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);
    const [availableLabels, setAvailableLabels] = useState([]);
    const [showBackgroundImage, setShowBackgroundImage] = useState(Boolean(backgroundImageSrc));

    useEffect(() => {
        if (cardConfig?.fetchLabels) {
            cardConfig.fetchLabels().then((options) => {
                setAvailableLabels(options);
            });
        }
    }, [cardConfig]);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey});
    };

    const imageUploader = fileUploader.useFileUpload('image');

    const handleImageChange = async (files) => {
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

    const onFileChange = async (e) => {
        handleImageChange(e.target.files);
    };

    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageChange});

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

    const handleToggleBackgroundImage = (e) => {
        if (e.target.checked) {
            setShowBackgroundImage(true);
        } else {
            setShowBackgroundImage(false);
            handleClearBackgroundImage();
        }
    };

    const handleBackgroundColor = (color) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setBackgroundColor(color);
        });
    };

    const handleButtonColor = (color) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setButtonColor(color);
        });
    };

    const handleLabels = (newLabels) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setLabels(newLabels);
        });
    };

    useEffect(() => {
        headerTextEditor.setEditable(isEditing);
        subheaderTextEditor.setEditable(isEditing);
    }, [isEditing, headerTextEditor, subheaderTextEditor]);
    return (
        <>
            <SignupCard
                availableLabels={availableLabels}
                backgroundColor={backgroundColor}
                backgroundImageSrc={backgroundImageSrc}
                buttonColor={buttonColor}
                buttonPlaceholder={buttonPlaceholder}
                buttonText={buttonText}
                disclaimer={disclaimer}
                disclaimerPlaceholder={disclaimerPlaceholder}
                disclaimerTextEditor={disclaimerTextEditor}
                disclaimerTextEditorInitialState={disclaimerTextEditorInitialState}
                fileUploader={imageUploader}
                handleBackgroundColor={handleBackgroundColor}
                handleButtonColor={handleButtonColor}
                handleButtonText={handleButtonText}
                handleClearBackgroundImage={handleClearBackgroundImage}
                handleLabels={handleLabels}
                handleSizeSelector={handleSizeSelector}
                handleToggleBackgroundImage={handleToggleBackgroundImage}
                header={header}
                headerPlaceholder={headerPlaceholder}
                headerTextEditor={headerTextEditor}
                headerTextEditorInitialState={headerTextEditorInitialState}
                imageDragHandler={imageDragHandler}
                isEditing={isEditing}
                labels={labels}
                showBackgroundImage={showBackgroundImage}
                subheader={subheader}
                subheaderPlaceholder={subheaderPlaceholder}
                subheaderTextEditor={subheaderTextEditor}
                subheaderTextEditorInitialState={subheaderTextEditorInitialState}
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
