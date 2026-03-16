import CardContext from '../../../context/CardContext';
import KoenigComposerContext from '../../../context/KoenigComposerContext';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../../../components/ui/ActionToolbar';
import {EDIT_CARD_COMMAND} from '../../../plugins/KoenigBehaviourPlugin';
import {HeaderCard} from '../../../components/ui/cards/HeaderCard/v1/HeaderCard';
import {SnippetActionToolbar} from '../../../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../../../components/ui/ToolbarMenu';
import {backgroundImageUploadHandler} from '../../../utils/imageUploadHandler';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {HeaderNode} from '../../HeaderNode';
import type {LexicalEditor} from 'lexical';

function $getHeaderNodeByKey(nodeKey: string): HeaderNode | null {
    return $getNodeByKey(nodeKey) as HeaderNode | null;
}

interface HeaderNodeComponentProps {
    nodeKey: string;
    backgroundImageSrc: string;
    button: boolean;
    subheaderTextEditorInitialState: string | undefined;
    buttonText: string;
    buttonUrl: string;
    type: 'dark' | 'light' | 'accent' | 'image';
    headerTextEditorInitialState: string | undefined;
    header: string;
    subheader: string;
    headerTextEditor: LexicalEditor;
    subheaderTextEditor: LexicalEditor;
    size: 'small' | 'medium' | 'large';
}

function HeaderNodeComponent({
    nodeKey,
    backgroundImageSrc,
    button,
    subheaderTextEditorInitialState,
    buttonText,
    buttonUrl,
    type,
    headerTextEditorInitialState,
    header,
    subheader,
    headerTextEditor,
    subheaderTextEditor,
    size
}: HeaderNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const {fileUploader} = React.useContext(KoenigComposerContext);
    const {isEditing, setEditing, isSelected} = React.useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        editor.dispatchCommand(EDIT_CARD_COMMAND, {cardKey: nodeKey, focusEditor: false});
    };

    const imageUploader = fileUploader.useFileUpload('image');

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = e.target.files;
        if (!files || files.length === 0) {
            return;
        }

        // reset original src so it can be replaced with preview and upload progress
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });

        const result = await backgroundImageUploadHandler(Array.from(files), imageUploader.upload);
        if (!result) {return;}
        const {imageSrc} = result;

        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = imageSrc ?? "";
        });
    };

    const fileInputRef = React.useRef<HTMLInputElement | null>(null);

    const openFilePicker = () => {
        fileInputRef.current?.click();
    };

    const handleColorSelector = (color: string) => {
        if (color === 'image' && backgroundImageSrc === ''){
            openFilePicker();
        }
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.style = color;
        });
    };

    const handleSizeSelector = (s: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.size = s;
        });
    };

    const handleButtonToggle = (event: React.ChangeEvent<HTMLInputElement>) => {
        event.stopPropagation();
        setEditing(true); // kinda weird but this avoids the card from unselecting itself when toggling.
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonEnabled = event.target.checked;
        });
    };

    const handleButtonText = (event: React.ChangeEvent<HTMLInputElement>) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonText = event.target.value;
        });
    };

    const handleButtonUrl = (val: string) => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.buttonUrl = val;
        });
    };

    const handleClearBackgroundImage = () => {
        editor.update(() => {
            const node = $getHeaderNodeByKey(nodeKey);
            if (!node) {return;}
            node.backgroundImageSrc = '';
        });
    };

    React.useEffect(() => {
        headerTextEditor.setEditable(isEditing);
        subheaderTextEditor.setEditable(isEditing);
    }, [isEditing, headerTextEditor, subheaderTextEditor]);
    return (
        <>
            <HeaderCard
                backgroundImageSrc={backgroundImageSrc}
                button={button}
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
                headerTextEditor={headerTextEditor}
                headerTextEditorInitialState={headerTextEditorInitialState}
                isEditing={isEditing}
                openFilePicker={openFilePicker}
                size={size}
                subheader={subheader}
                subheaderTextEditor={subheaderTextEditor}
                subheaderTextEditorInitialState={subheaderTextEditorInitialState}
                type={type}
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
                        label="Save as snippet"
                        onClick={() => setShowSnippetToolbar(true)}
                    />
                </ToolbarMenu>
            </ActionToolbar>
        </>
    );
}

export default HeaderNodeComponent;
