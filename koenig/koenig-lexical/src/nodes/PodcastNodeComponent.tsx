import CardContext from '../context/CardContext';
import KoenigComposerContext from '../context/KoenigComposerContext.jsx';
import React from 'react';
import {$getNodeByKey} from 'lexical';
import {ActionToolbar} from '../components/ui/ActionToolbar.jsx';
import {PodcastCard} from '../components/ui/cards/PodcastCard.jsx';
import {SnippetActionToolbar} from '../components/ui/SnippetActionToolbar.jsx';
import {ToolbarMenu, ToolbarMenuItem, ToolbarMenuSeparator} from '../components/ui/ToolbarMenu.jsx';
import {useLexicalComposerContext} from '@lexical/react/LexicalComposerContext';

export const PodcastNodeComponent = ({
    nodeKey,
    episodeId,
    podcastTitle,
    title,
    description,
    episodeUrl,
    duration,
    artworkUrl
}) => {
    const [editor] = useLexicalComposerContext();
    const {isEditing, isSelected, setEditing} = React.useContext(CardContext);
    const {cardConfig} = React.useContext(KoenigComposerContext);
    const [showSnippetToolbar, setShowSnippetToolbar] = React.useState(false);

    // Podcasts and their episodes come from Admin's Podcasts app via cardConfig.
    const podcasts = cardConfig?.podcasts ?? [];

    const handleSelect = (podcast, episode) => {
        editor.update(() => {
            const node = $getNodeByKey(nodeKey);
            node.podcastId = podcast.id;
            node.episodeId = episode.id;
            node.podcastTitle = podcast.title;
            node.title = episode.title;
            node.description = episode.description;
            node.episodeUrl = episode.audioUrl;
            node.duration = episode.duration;
            node.artworkUrl = episode.artworkUrl || podcast.artworkUrl || '';
        });
        setEditing(false);
    };

    const handleCancel = React.useCallback(() => {
        setEditing(false);
    }, [setEditing]);

    const handleToolbarEdit = (event) => {
        event.preventDefault();
        event.stopPropagation();
        setEditing(true);
    };

    return (
        <>
            <PodcastCard
                artworkUrl={artworkUrl}
                description={description}
                duration={duration}
                episodeId={episodeId}
                episodeUrl={episodeUrl}
                isEditing={isEditing}
                podcasts={podcasts}
                podcastTitle={podcastTitle}
                title={title}
                onCancel={handleCancel}
                onSelect={handleSelect}
            />

            <ActionToolbar
                data-kg-card-toolbar="podcast"
                isVisible={showSnippetToolbar}
            >
                <SnippetActionToolbar onClose={() => setShowSnippetToolbar(false)} />
            </ActionToolbar>

            <ActionToolbar
                data-kg-card-toolbar="podcast"
                isVisible={isSelected && !isEditing && !showSnippetToolbar}
            >
                <ToolbarMenu>
                    <ToolbarMenuItem
                        dataTestId="edit-podcast-card"
                        icon="edit"
                        isActive={false}
                        label={episodeId ? 'Change episode' : 'Choose episode'}
                        onClick={handleToolbarEdit}
                    />
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
