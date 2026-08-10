import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import usePinturaEditor from '../hooks/usePinturaEditor';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SignupCard} from '../components/ui/cards/SignupCard.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../utils/imageUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {useContext, useEffect, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

function SignupNodeComponent({
    alignment,
    backgroundColor,
    backgroundImageSrc,
    backgroundSize,
    buttonColor,
    buttonText,
    buttonTextColor,
    nodeKey,
    disclaimer,
    disclaimerTextEditor,
    disclaimerTextEditorInitialState,
    header,
    headerTextEditor,
    headerTextEditorInitialState,
    labels,
    layout,
    subheader,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    textColor,
    isSwapped
}) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = useContext(KoenigComposerContext);
    const {fileUploader} = useContext(KoenigComposerContext);
    const {isEditing, isSelected} = useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);
    const [availableLabels, setAvailableLabels] = useState([]);
    const [showBackgroundImage, setShowBackgroundImage] = useState(Boolean(backgroundImageSrc));
    const [lastBackgroundImage, setLastBackgroundImage] = useState(backgroundImageSrc);

    // this is used to determine if the image was deliberately removed by the user or not, for some UX finesse
    const [imageRemoved, setImageRemoved] = useState(false);

    const {isEnabled: isPinturaEnabled, openEditor: openImageEditor} = usePinturaEditor({config: cardConfig.pinturaConfig});
    const fileInputRef = useRef(null);

    useEffect(() => {
        if (cardConfig.renderLabels && cardConfig.fetchLabels) {
            cardConfig.fetchLabels().then((options) => {
                setAvailableLabels(options);
            });
        }
    }, [cardConfig]);

    useEffect(() => {
        if (layout !== 'split') {
            setShowBackgroundImage(Boolean(backgroundImageSrc));
        }

        if (layout === 'split' && !backgroundImageSrc && lastBackgroundImage) {
            handleShowBackgroundImage();
        }
        // We just want to reset the show background image state when the layout changes, not when the image changes
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layout]);

    const handleAlignment = (a) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.alignment = a;
        });
    };

    const handleBackgroundSize = (a) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundSize = a;
        });
    };

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const imageUploader = fileUploader.useFileUpload('image');

    const handleImageChange = async (files) => {
        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundImageSrc = '';
        });

        const {imageSrc} = await backgroundImageUploadHandler(files, imageUploader.upload);

        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundImageSrc = imageSrc;
        });

        setLastBackgroundImage(imageSrc);
        setImageRemoved(false);
    };

    const onFileChange = async (e) => {
        handleImageChange(e.target.files);
    };

    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageChange});

    const handleLayout = (l) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.layout = l;
        });
    };

    const handleButtonText = (event) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonText = event.target.value;
        });
    };

    const handleButtonTextBlur = (event) => {
        if (!event.target.value) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.buttonText = 'Subscribe';
            });
        }
    };

    const handleClearBackgroundImage = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundImageSrc = '';
        });
        setImageRemoved(true);
    };

    const handleShowBackgroundImage = () => {
        setShowBackgroundImage(true);

        if (lastBackgroundImage && !imageRemoved) {
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                node.backgroundImageSrc = lastBackgroundImage;
            });
        } else {
            openFileSelection({fileInputRef});
        }
    };

    const handleHideBackgroundImage = () => {
        setShowBackgroundImage(false);
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundImageSrc = '';
        });
    };

    const handleBackgroundColor = (color, matchingTextColor) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.backgroundColor = color;
            node.textColor = matchingTextColor;

            if (layout !== 'split') {
                handleHideBackgroundImage();
            }
        });
    };

    const handleTextColor = (color) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.textColor = color;
        });
    };

    const handleButtonColor = (color, matchingTextColor) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.buttonColor = color;
            node.buttonTextColor = matchingTextColor;
        });
    };

    const handleLabels = (newLabels) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.setLabels(newLabels);
        });
    };

    const handleSwapLayout = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.swapped = !isSwapped;
        });
    };

    useEffect(() => {
        headerTextEditor.setEditable(isEditing);
        subheaderTextEditor.setEditable(isEditing);
        disclaimerTextEditor.setEditable(isEditing);
    }, [isEditing, headerTextEditor, subheaderTextEditor, disclaimerTextEditor]);

    return (
        <>
            <SignupCard
                alignment={alignment}
                availableLabels={availableLabels}
                backgroundColor={backgroundColor}
                backgroundImageSrc={backgroundImageSrc}
                backgroundSize={backgroundSize}
                buttonColor={buttonColor}
                buttonText={buttonText}
                buttonTextColor={buttonTextColor}
                disclaimer={disclaimer}
                disclaimerTextEditor={disclaimerTextEditor}
                disclaimerTextEditorInitialState={disclaimerTextEditorInitialState}
                fileUploader={imageUploader}
                handleAlignment={handleAlignment}
                handleBackgroundColor={handleBackgroundColor}
                handleBackgroundSize={handleBackgroundSize}
                handleButtonColor={handleButtonColor}
                handleButtonText={handleButtonText}
                handleButtonTextBlur={handleButtonTextBlur}
                handleClearBackgroundImage={handleClearBackgroundImage}
                handleHideBackgroundImage={handleHideBackgroundImage}
                handleLabels={handleLabels}
                handleLayout={handleLayout}
                handleShowBackgroundImage={handleShowBackgroundImage}
                handleSwapLayout={handleSwapLayout}
                handleTextColor={handleTextColor}
                header={header}
                headerTextEditor={headerTextEditor}
                headerTextEditorInitialState={headerTextEditorInitialState}
                imageDragHandler={imageDragHandler}
                isEditing={isEditing}
                isPinturaEnabled={isPinturaEnabled}
                isSwapped={isSwapped}
                labels={labels}
                layout={layout}
                openImageEditor={openImageEditor}
                renderLabels={cardConfig.renderLabels}
                setFileInputRef={ref => fileInputRef.current = ref}
                showBackgroundImage={showBackgroundImage}
                subheader={subheader}
                subheaderTextEditor={subheaderTextEditor}
                subheaderTextEditorInitialState={subheaderTextEditorInitialState}
                textColor={textColor}
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
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export default SignupNodeComponent;
