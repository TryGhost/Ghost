import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import usePinturaEditor from '../hooks/usePinturaEditor';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../plugins/KoenigBehaviourPlugin';
import {SignupCard} from '../components/ui/cards/SignupCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../utils/imageUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {useContext, useEffect, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {LexicalEditor} from 'lexical';
import type {SignupNode} from './SignupNode';

function $getSignupNodeByKey(nodeKey: string): SignupNode | null {
    return $getNodeByKey(nodeKey) as SignupNode | null;
}

type Layout = 'regular' | 'wide' | 'full' | 'split';
type Alignment = 'left' | 'center';
type BackgroundSize = 'cover' | 'contain';

interface SignupNodeComponentProps {
    alignment: Alignment;
    backgroundColor: string;
    backgroundImageSrc: string;
    backgroundSize: BackgroundSize;
    buttonColor: string;
    buttonText: string;
    buttonTextColor: string;
    nodeKey: string;
    disclaimer: string;
    disclaimerTextEditor: LexicalEditor;
    disclaimerTextEditorInitialState: string | undefined;
    header: string;
    headerTextEditor: LexicalEditor;
    headerTextEditorInitialState: string | undefined;
    labels: string[];
    layout: Layout;
    subheader: string;
    subheaderTextEditor: LexicalEditor;
    subheaderTextEditorInitialState: string | undefined;
    textColor: string;
    isSwapped: boolean;
}

function SignupNodeComponent({
    alignment,
    backgroundColor,
    backgroundImageSrc,
    backgroundSize,
    buttonColor,
    buttonText,
    buttonTextColor,
    nodeKey,
    disclaimer: _disclaimer,
    disclaimerTextEditor,
    disclaimerTextEditorInitialState,
    header: _header,
    headerTextEditor,
    headerTextEditorInitialState,
    labels,
    layout,
    subheader: _subheader,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    textColor,
    isSwapped
}: SignupNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = useContext(KoenigComposerContext);
    const {fileUploader} = useContext(KoenigComposerContext);
    const {isEditing, isSelected} = useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);
    const [availableLabels, setAvailableLabels] = useState<string[]>([]);
    const [showBackgroundImage, setShowBackgroundImage] = useState(Boolean(backgroundImageSrc));
    const [lastBackgroundImage, setLastBackgroundImage] = useState(backgroundImageSrc);

    // this is used to determine if the image was deliberately removed by the user or not, for some UX finesse
    const [imageRemoved, setImageRemoved] = useState(false);

    const {isEnabled: isPinturaEnabled, openEditor: openImageEditor} = usePinturaEditor({config: cardConfig.pinturaConfig});
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    useEffect(() => {
        if (cardConfig.renderLabels && cardConfig.fetchLabels) {
            cardConfig.fetchLabels().then((options: string[]) => {
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

    const handleAlignment = (a: string) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.alignment = a;
        });
    };

    const handleBackgroundSize = (a: string) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundSize = a;
        });
    };

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const imageUploader = fileUploader.useFileUpload('image');

    const handleImageChange = async (files: File[] | FileList | null) => {
        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });

        const result = await backgroundImageUploadHandler(Array.from(files!), imageUploader.upload);
        if (!result) {return;}
        const {imageSrc} = result;

        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = imageSrc ?? "";
        });

        setLastBackgroundImage(imageSrc as string);
        setImageRemoved(false);
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageChange(e.target.files);
    };

    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageChange});

    const handleLayout = (l: string) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.layout = l;
        });
    };

    const handleButtonText = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonText = event.target.value;
        });
    };

    const handleButtonTextBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        if (!event.target.value) {
            editor.update(() => {
                const node = $getSignupNodeByKey(nodeKey);
                if (!node) {return;}
                node.buttonText = 'Subscribe';
            });
        }
    };

    const handleClearBackgroundImage = () => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });
        setImageRemoved(true);
    };

    const handleShowBackgroundImage = () => {
        setShowBackgroundImage(true);

        if (lastBackgroundImage && !imageRemoved) {
            editor.update(() => {
                const node = $getSignupNodeByKey(nodeKey);
                if (!node) {return;}
                node.backgroundImageSrc = lastBackgroundImage;
            });
        } else {
            openFileSelection({fileInputRef});
        }
    };

    const handleHideBackgroundImage = () => {
        setShowBackgroundImage(false);
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });
    };

    const handleBackgroundColor = (color: string, matchingTextColor: string) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundColor = color;
            node.textColor = matchingTextColor;

            if (layout !== 'split') {
                handleHideBackgroundImage();
            }
        });
    };

    const handleTextColor = (color: string) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.textColor = color;
        });
    };

    const handleButtonColor = (color: string, matchingTextColor: string) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonColor = color;
            node.buttonTextColor = matchingTextColor;
        });
    };

    const handleLabels = (newLabels: string[]) => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
            node.setLabels(newLabels);
        });
    };

    const handleSwapLayout = () => {
        editor.update(() => {
            const node = $getSignupNodeByKey(nodeKey);
            if (!node) {return;}
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
                headerTextEditor={headerTextEditor}
                headerTextEditorInitialState={headerTextEditorInitialState}
                imageDragHandler={imageDragHandler}
                isEditing={isEditing}
                isPinturaEnabled={isPinturaEnabled}
                isSwapped={isSwapped}
                labels={labels}
                layout={layout}
                openImageEditor={openImageEditor}
                renderLabels={!!cardConfig.renderLabels}
                setFileInputRef={(ref) => {
                    fileInputRef.current = ref;
                }}
                showBackgroundImage={showBackgroundImage}
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
