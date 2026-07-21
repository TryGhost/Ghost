import CardContext from '../../../context/CardContext';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
import useFileDragAndDrop from '../../../hooks/useFileDragAndDrop';
import usePinturaEditor from '../../../hooks/usePinturaEditor';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../../../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../../../plugins/KoenigBehaviourPlugin';
import type {HeaderNode} from '../../HeaderNode';
import type {LexicalEditor} from 'lexical';
// import {SignupCard} from '../components/ui/cards/SignupCard';
import {HeaderCard} from '../../../components/ui/cards/HeaderCard/v2/HeaderCard';
import {SnippetActionToolbar} from '../../../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../../../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../../../utils/imageUploadHandler';
import {getAccentColor} from '../../../utils/getAccentColor';
import {openFileSelection} from '../../../utils/openFileSelection';
import {useContext, useEffect, useRef, useState} from 'react';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
// {name: 'size', default: 'small'}, // v1
// {name: 'style', default: 'dark'}, // v1
// do we need these?

function $getHeaderNodeByKey(nodeKey: string): HeaderNode | null {
    return $getNodeByKey(nodeKey) as HeaderNode | null;
}

// this is v2 of the header card
type Layout = 'regular' | 'wide' | 'full' | 'split';
type Alignment = 'left' | 'center';
type BackgroundSize = 'cover' | 'contain';

interface HeaderNodeComponentProps {
    alignment: Alignment;
    backgroundColor: string;
    backgroundImageSrc: string;
    backgroundImageWidth: number | null;
    backgroundImageHeight: number | null;
    backgroundSize: BackgroundSize;
    buttonColor: string;
    buttonText: string;
    buttonTextColor: string;
    buttonUrl: string;
    buttonEnabled: boolean;
    nodeKey: string;
    header: string;
    headerTextEditor: LexicalEditor;
    headerTextEditorInitialState: string | undefined;
    layout: Layout;
    subheader: string;
    subheaderTextEditor: LexicalEditor;
    subheaderTextEditorInitialState: string | undefined;
    textColor: string;
    isSwapped: boolean;
    accentColor: string;
}

function HeaderNodeComponent({
    alignment,
    backgroundColor,
    backgroundImageSrc,
    backgroundImageWidth: _backgroundImageWidth,
    backgroundImageHeight: _backgroundImageHeight,
    backgroundSize,
    buttonColor,
    buttonText,
    buttonTextColor,
    buttonUrl,
    buttonEnabled,
    nodeKey,
    header: _header,
    headerTextEditor,
    headerTextEditorInitialState,
    layout,
    subheader: _subheader,
    subheaderTextEditor,
    subheaderTextEditorInitialState,
    textColor,
    isSwapped,
    accentColor: _accentColor
}: HeaderNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = useContext(KoenigComposerContext);
    const {fileUploader} = useContext(KoenigComposerContext);
    const {isEditing, isSelected} = useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = useState(false);
    const [showBackgroundImage, setShowBackgroundImage] = useState(Boolean(backgroundImageSrc));
    const [lastBackgroundImage, setLastBackgroundImage] = useState(backgroundImageSrc);

    // this is used to determine if the image was deliberately removed by the user or not, for some UX finesse
    const [imageRemoved, setImageRemoved] = useState(false);

    const {isEnabled: isPinturaEnabled, openEditor: openImageEditor} = usePinturaEditor({config: cardConfig.pinturaConfig});
    const fileInputRef = useRef<HTMLInputElement | null>(null);

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

    useEffect(() => {
        const accent = getAccentColor();

        if (accent) {
            editor.update(() => {
                const node = $getHeaderNodeByKey(nodeKey);
                if (!node) {return;}
                node.accentColor = accent;
            });
        }
    }, [editor, nodeKey]);

    const handleAlignment = (a: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.alignment = a;
        });
    };

    const handleBackgroundSize = (a: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
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
        if (!files || files.length === 0) {
            return;
        }

        const result = await backgroundImageUploadHandler(Array.from(files), imageUploader.upload);
        if (!result) {return;}
        const {width, height} = result;
        const imageSrc = result.imageSrc ?? "";

        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = imageSrc;
            node.backgroundImageWidth = width;
            node.backgroundImageHeight = height;
        });

        setLastBackgroundImage(imageSrc);
        setImageRemoved(false);
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        handleImageChange(e.target.files);
    };

    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageChange});

    const handleLayout = (l: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.layout = l;
        });
    };

    const handleButtonText = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonText = event.target.value;
        });
    };

    const handleButtonTextBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        if (!event.target.value) {
            editor.update(() => {
                const node = $getHeaderNodeByKey(nodeKey);
                if (!node) {return;}
                node.buttonText = '';
            });
        }
    };

    const handleClearBackgroundImage = () => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });
        setImageRemoved(true);
    };

    const handleShowBackgroundImage = () => {
        setShowBackgroundImage(true);

        if (lastBackgroundImage && !imageRemoved) {
            editor.update(() => {
                const node = $getHeaderNodeByKey(nodeKey);
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
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });
    };

    const handleBackgroundColor = (color: string, matchingTextColor: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
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
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.textColor = color;
        });
    };

    const handleButtonColor = (color: string, matchingTextColor: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonColor = color;
            node.buttonTextColor = matchingTextColor;
        });
    };

    const handleSwapLayout = () => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.swapped = !isSwapped;
        });
    };

    const handleButtonEnabled = () => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonEnabled = !buttonEnabled;
        });
    };

    const handleButtonUrl = (val: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonUrl = val;
        });
    };

    const handleButtonUrlBlur = (event: React.FocusEvent<HTMLInputElement>) => {
        if (!event.target.value) {
            editor.update(() => {
                const node = $getHeaderNodeByKey(nodeKey);
                if (!node) {return;}
                node.buttonUrl = 'https://';
            });
        }
    };

    useEffect(() => {
        headerTextEditor.setEditable(isEditing);
        subheaderTextEditor.setEditable(isEditing);
    }, [isEditing, headerTextEditor, subheaderTextEditor]);

    return (
        <>
            <HeaderCard
                alignment={alignment}
                backgroundColor={backgroundColor}
                backgroundImageSrc={backgroundImageSrc}
                backgroundSize={backgroundSize}
                buttonColor={buttonColor}
                buttonEnabled={buttonEnabled}
                buttonText={buttonText}
                buttonTextColor={buttonTextColor}
                buttonUrl={buttonUrl}
                fileUploader={imageUploader}
                handleAlignment={handleAlignment}
                handleBackgroundColor={handleBackgroundColor}
                handleBackgroundSize={handleBackgroundSize}
                handleButtonColor={handleButtonColor}
                handleButtonEnabled={handleButtonEnabled}
                handleButtonText={handleButtonText}
                handleButtonTextBlur={handleButtonTextBlur}
                handleButtonUrl={handleButtonUrl}
                handleButtonUrlBlur={handleButtonUrlBlur}
                handleClearBackgroundImage={handleClearBackgroundImage}
                handleHideBackgroundImage={handleHideBackgroundImage}
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
                layout={layout}
                openImageEditor={openImageEditor}
                setFileInputRef={ref => fileInputRef.current = ref}
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

export default HeaderNodeComponent;
