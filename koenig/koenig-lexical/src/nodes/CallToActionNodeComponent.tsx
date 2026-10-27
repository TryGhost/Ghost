import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React, {useRef} from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {CallToActionCard} from '../components/ui/cards/CallToActionCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {getImageDimensions} from '../utils/getImageDimensions';
import {useKoenigSelectedCardContext} from '../context/KoenigSelectedCardContext';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import {useVisibilityToggle} from '../hooks/useVisibilityToggle';
import type {CallToActionNode} from '@tryghost/kg-default-nodes';
import type {LexicalEditor} from 'lexical';

interface CallToActionNodeComponentProps {
    nodeKey: string;
    alignment: string;
    backgroundColor: string;
    buttonText: string;
    buttonUrl: string;
    hasSponsorLabel: boolean;
    imageUrl: string | null;
    layout: string;
    linkColor: string;
    showButton: boolean;
    showDividers: boolean;
    textValue: string;
    buttonColor: string;
    htmlEditor: LexicalEditor;
    htmlEditorInitialState: unknown;
    buttonTextColor: string;
    sponsorLabelHtmlEditor: LexicalEditor;
    sponsorLabelHtmlEditorInitialState: unknown;
}

export const CallToActionNodeComponent: React.FC<CallToActionNodeComponentProps> = ({
    nodeKey,
    alignment,
    backgroundColor,
    buttonText,
    buttonUrl,
    hasSponsorLabel,
    imageUrl,
    layout,
    linkColor,
    showButton,
    showDividers,
    textValue: _textValue,
    buttonColor,
    htmlEditor,
    htmlEditorInitialState,
    buttonTextColor,
    sponsorLabelHtmlEditor,
    sponsorLabelHtmlEditorInitialState
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);
    const imageDragHandler = useFileDragAndDrop({handleDrop: handleImageDrop});

    const {isVisibilityEnabled, visibilityOptions, toggleVisibility} = useVisibilityToggle(editor, nodeKey, cardConfig);

    const {showVisibilitySettings} = useKoenigSelectedCardContext();

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const imageUploader = fileUploader.useFileUpload('image');

    const toggleShowButton = (_event: unknown) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.showButton = !node.showButton;
        });
    };

    const toggleShowDividers = (_event: unknown) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.showDividers = !node.showDividers;
        });
    };

    const handleButtonTextChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.buttonText = event.target.value;
        });
    };

    const handleButtonUrlChange = (val: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.buttonUrl = val;
        });
    };

    const handleButtonColorChange = (val: string, matchingTextColor: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.buttonColor = val;
            node.buttonTextColor = matchingTextColor;
        });
    };
    const handleHasSponsorLabelChange = (_val: unknown) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            // get the current value and toggle it
            node.hasSponsorLabel = !node.hasSponsorLabel;
        });
    };

    const handleBackgroundColorChange = (val: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.backgroundColor = val;
        });
    };

    const handleLinkColorChange = (val: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.linkColor = val;
        });
    };

    const handleImageChange = async (files: FileList | File[] | null) => {
        if (!files || files.length === 0) {
            return;
        }

        const imgPreviewUrl = URL.createObjectURL(files[0]);
        try {
            const {width, height} = await getImageDimensions(imgPreviewUrl);
            const result = await imageUploader.upload(Array.from(files));
            // reset original src so it can be replaced with preview and upload progress
            editor.update(() => {
                const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
                if (!node) {return;}
                node.imageUrl = result?.[0]?.url ?? null;
                node.imageWidth = width;
                node.imageHeight = height;
            });
        } finally {
            URL.revokeObjectURL(imgPreviewUrl);
        }
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const {files} = e.target;
        if (!files || files.length === 0) {
            return;
        }

        handleImageChange(files);
    };

    const onRemoveMedia = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.imageUrl = null;
            node.imageWidth = null;
            node.imageHeight = null;
        });
    };
    const handleUpdatingLayout = (val: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.layout = val;
        });
    };

    const handleUpdatingAlignment = (val: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as CallToActionNode | null;
            if (!node) {return;}
            node.alignment = val;
        });
    };

    async function handleImageDrop(files: FileList | File[]) {
        await handleImageChange(files);
    }

    React.useEffect(() => {
        (htmlEditor as {setEditable: (editable: boolean) => void}).setEditable(isEditing);
    }, [isEditing, htmlEditor]);

    return (
        <>
            <CallToActionCard
                alignment={alignment as 'left' | 'center' | undefined}
                buttonColor={buttonColor}
                buttonText={buttonText}
                buttonTextColor={buttonTextColor}
                buttonUrl={buttonUrl}
                color={backgroundColor as 'none' | 'grey' | 'white' | 'blue' | 'green' | 'yellow' | 'red' | 'pink' | 'purple'}
                handleButtonColor={handleButtonColorChange}
                handleColorChange={handleBackgroundColorChange}
                handleLinkColorChange={handleLinkColorChange}
                hasSponsorLabel={hasSponsorLabel}
                htmlEditor={htmlEditor}
                htmlEditorInitialState={htmlEditorInitialState as string | undefined}
                imageDragHandler={imageDragHandler}
                imageSrc={imageUrl ?? undefined}
                imageUploader={imageUploader}
                isEditing={isEditing}
                layout={layout as 'minimal' | 'immersive' | undefined}
                linkColor={linkColor as 'text' | 'accent' | undefined}
                setFileInputRef={(ref: HTMLInputElement | null) => fileInputRef.current = ref}
                showButton={showButton}
                showDividers={showDividers}
                showVisibilitySettings={isVisibilityEnabled && showVisibilitySettings}
                sponsorLabelHtmlEditor={sponsorLabelHtmlEditor}
                sponsorLabelHtmlEditorInitialState={sponsorLabelHtmlEditorInitialState as string | undefined}
                toggleVisibility={toggleVisibility}
                updateAlignment={handleUpdatingAlignment}
                updateButtonText={handleButtonTextChange}
                updateButtonUrl={handleButtonUrlChange}
                updateHasSponsorLabel={handleHasSponsorLabelChange}
                updateLayout={handleUpdatingLayout}
                updateShowButton={toggleShowButton}
                updateShowDividers={toggleShowDividers}
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
                data-kg-card-toolbar="button"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
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
