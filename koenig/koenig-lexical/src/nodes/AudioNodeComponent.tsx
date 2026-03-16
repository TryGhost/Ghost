import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext';
import React from 'react';
import useFileDragAndDrop from '../hooks/useFileDragAndDrop';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar';
import {AudioCard} from '../components/ui/cards/AudioCard';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu';
import {audioUploadHandler} from '../utils/audioUploadHandler';
import {openFileSelection} from '../utils/openFileSelection';
import {thumbnailUploadHandler} from '../utils/thumbnailUploadHandler';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';
import type {AudioNode} from './AudioNode';

interface AudioNodeComponentProps {
    duration: number;
    initialFile: File | null;
    nodeKey: string;
    src: string;
    thumbnailSrc: unknown;
    title: string;
    triggerFileDialog: boolean;
}

export function AudioNodeComponent({duration, initialFile, nodeKey, src, thumbnailSrc, title, triggerFileDialog}: AudioNodeComponentProps) {
    const [editor] = useLexicalComposerContext();
    const {fileUploader, cardConfig} = React.useContext(KoenigComposerContext);
    const {isSelected, isEditing, setEditing} = React.useContext(CardContext);
    const audioFileInputRef = React.useRef<HTMLInputElement>(null);
    const thumbnailFileInputRef = React.useRef<HTMLInputElement>(null);
    const cardContext = React.useContext(CardContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    const audioUploader = fileUploader.useFileUpload('audio');
    const thumbnailUploader = fileUploader.useFileUpload('mediaThumbnail');
    const audioDragHandler = useFileDragAndDrop({handleDrop: handleAudioDrop});
    const thumbnailDragHandler = useFileDragAndDrop({handleDrop: handleThumbnailDrop, disabled: !isEditing});

    React.useEffect(() => {
        const uploadInitialFile = async (file: File) => {
            if (file && !src && !audioUploader.isLoading) {
                await audioUploadHandler([file], nodeKey, editor, audioUploader.upload);
            }
        };

        uploadInitialFile(initialFile as File);

        // We only do this for init
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const onAudioFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fls = e.target.files;
        return await audioUploadHandler(Array.from(fls!), nodeKey, editor, audioUploader.upload);
    };

    const onThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const fls = e.target.files;
        return await thumbnailUploadHandler(Array.from(fls!), nodeKey, editor, thumbnailUploader.upload as (files: File[], options?: {formData: {url: string}}) => Promise<{url: string}[]>);
    };

    const setTitle = (newTitle: string) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as AudioNode | null;
            if (node) {
                node.title = newTitle;
            }
        });
    };

    const removeThumbnail = () => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey) as AudioNode | null;
            if (node) {
                node.thumbnailSrc = '';
            }
        });
    };

    async function handleAudioDrop(files: FileList | File[]) {
        await audioUploadHandler(Array.from(files), nodeKey, editor, audioUploader.upload);
    }

    async function handleThumbnailDrop(files: FileList | File[]) {
        await thumbnailUploadHandler(Array.from(files), nodeKey, editor, thumbnailUploader.upload as (files: File[], options?: {formData: {url: string}}) => Promise<{url: string}[]>);
    }

    const handleToolbarEdit = (event: React.MouseEvent) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    // when card is inserted from the card menu or slash command we want to show the file picker immediately
    // uses a setTimeout to avoid issues with React rendering the component twice in dev mode 🙈
    React.useEffect(() => {
        if (!triggerFileDialog) {
            return;
        }

        const renderTimeout = setTimeout(() => {
            // trigger dialog
            openFileSelection({fileInputRef: audioFileInputRef});

            // clear the property on the node so we don't accidentally trigger anything with a re-render
            editor.update(() => {
                const node = $getNodeByKey(nodeKey);
                if (node) {
                    (node as AudioNode).triggerFileDialog = false;
                }
            });
        });

        return (() => {
            clearTimeout(renderTimeout);
        });
    });

    return (
        <>
            <AudioCard
                audioDragHandler={audioDragHandler}
                audioFileInputRef={audioFileInputRef}
                audioMimeTypes={fileUploader.fileTypes.audio?.mimeTypes}
                audioUploader={audioUploader}
                duration={duration}
                isEditing={cardContext.isEditing}
                removeThumbnail={removeThumbnail}
                src={src}
                thumbnailDragHandler={thumbnailDragHandler}
                thumbnailFileInputRef={thumbnailFileInputRef}
                thumbnailMimeTypes={fileUploader.fileTypes.image?.mimeTypes}
                thumbnailSrc={thumbnailSrc as string | undefined}
                thumbnailUploader={thumbnailUploader}
                title={title}
                updateTitle={setTitle}
                onAudioFileChange={onAudioFileChange}
                onThumbnailFileChange={onThumbnailFileChange}
            />
            <ActionToolbar
                data-kg-card-toolbar="audio"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="audio"
                isVisible={!!src && isSelected && !isEditing && !showSnippetToolbar}
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
