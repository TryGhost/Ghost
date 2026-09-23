import PodcastIcon from '../../../assets/icons/kg-card-type-podcast.svg?react';
import PropTypes from 'prop-types';
import React from 'react';
import {HighlightedString} from '../HighlightedString';
import {INPUT_CLASSES, Input} from '../Input';
import {InputListGroup, InputListItem} from '../InputList';
import {KeyboardSelectionWithGroups} from '../KeyboardSelectionWithGroups';

// Matches the Podcasts app's brand colour in Admin (apps/admin/src/apps/app-registry.ts).
const PODCAST_BRAND_COLOR = '#FA5D00';

const podcastShape = PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    artworkUrl: PropTypes.string,
    episodes: PropTypes.arrayOf(PropTypes.shape({
        id: PropTypes.string.isRequired,
        title: PropTypes.string.isRequired,
        description: PropTypes.string,
        audioUrl: PropTypes.string,
        duration: PropTypes.string,
        artworkUrl: PropTypes.string,
        status: PropTypes.string
    })).isRequired
});

export function PodcastCard({
    podcasts = [],
    episodeId = '',
    podcastTitle = '',
    title = '',
    description = '',
    episodeUrl = '',
    duration = '',
    artworkUrl = '',
    isEditing = false,
    onSelect = () => {},
    onCancel = () => {}
}) {
    if (isEditing) {
        return (
            <EpisodePicker
                episodeId={episodeId}
                podcasts={podcasts}
                onCancel={onCancel}
                onSelect={onSelect}
            />
        );
    }

    return (
        <div className="w-full rounded-lg border border-grey-300 bg-white dark:border-grey-900 dark:bg-grey-950" data-testid="podcast-card">
            <EpisodePreview
                artworkUrl={artworkUrl}
                description={description}
                duration={duration}
                episodeId={episodeId}
                episodeUrl={episodeUrl}
                podcastTitle={podcastTitle}
                title={title}
            />
        </div>
    );
}

const TEST_ID = 'podcast-picker';

function matchesQuery(episode, query) {
    if (!query) {
        return true;
    }
    const needle = query.toLowerCase();
    return episode.title.toLowerCase().includes(needle)
        || (episode.description || '').toLowerCase().includes(needle);
}

/**
 * Searchable list of every episode across the writer's podcasts, in the same
 * shape as the bookmark card's link search: an input on top, grouped results
 * underneath, arrow keys and Enter to pick.
 */
function EpisodePicker({podcasts, episodeId, onSelect, onCancel}) {
    const [query, setQuery] = React.useState('');

    React.useEffect(() => {
        const onKeyDown = (event) => {
            if (event.key === 'Escape') {
                onCancel();
            }
        };
        window.addEventListener('keydown', onKeyDown);
        return () => window.removeEventListener('keydown', onKeyDown);
    }, [onCancel]);

    const groups = podcasts
        .map(podcast => ({
            label: podcast.title,
            items: podcast.episodes
                .filter(episode => matchesQuery(episode, query))
                .map(episode => ({
                    value: episode.id,
                    label: episode.title,
                    podcast,
                    episode
                }))
        }))
        .filter(group => group.items.length > 0);
    const items = groups.flatMap(group => group.items);
    const defaultSelected = items.find(item => item.value === episodeId);
    const totalEpisodes = podcasts.reduce((sum, podcast) => sum + podcast.episodes.length, 0);

    const getGroup = (group) => {
        // A single podcast needs no heading; the writer knows whose episodes these are.
        if (podcasts.length === 1) {
            return <React.Fragment key={group.label} />;
        }
        return <InputListGroup key={group.label} dataTestId={TEST_ID} group={group} />;
    };

    const getItem = (item, selected, onMouseOver, scrollIntoView) => (
        <EpisodePickerItem
            key={item.value}
            highlightString={query}
            item={item}
            scrollIntoView={scrollIntoView}
            selected={selected}
            onClick={() => onSelect(item.podcast, item.episode)}
            onMouseOver={onMouseOver}
        />
    );

    let body;
    if (podcasts.length === 0 || totalEpisodes === 0) {
        body = (
            <EmptyMessage
                dataTestId={`${TEST_ID}-empty`}
                text={podcasts.length === 0
                    ? 'No podcasts yet. Create one under Apps → Podcasts and add an episode to it.'
                    : 'No episodes yet. Add one under Apps → Podcasts.'}
            />
        );
    } else if (items.length === 0) {
        body = <EmptyMessage dataTestId={`${TEST_ID}-no-results`} text={`No episodes match “${query}”.`} />;
    } else {
        body = (
            <ul className="max-h-[30vh] w-full overflow-y-auto py-1" data-testid={`${TEST_ID}-episodes`}>
                <KeyboardSelectionWithGroups
                    defaultSelected={defaultSelected}
                    getGroup={getGroup}
                    getItem={getItem}
                    groups={groups}
                    onSelect={item => onSelect(item.podcast, item.episode)}
                />
            </ul>
        );
    }

    return (
        <div className="not-kg-prose flex w-full flex-col rounded-lg border border-grey-300 bg-white p-2 dark:border-grey-900 dark:bg-grey-950" data-testid={TEST_ID}>
            <Input
                autoFocus={true}
                className={`${INPUT_CLASSES} w-full`}
                dataTestId={`${TEST_ID}-search`}
                placeholder={totalEpisodes > 0 ? 'Search episodes' : 'Choose an episode'}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={(e) => {
                    // Enter is handled by the keyboard selection; keep it out of the editor.
                    if (e.key === 'Enter') {
                        e.preventDefault();
                    }
                }}
            />
            {body}
        </div>
    );
}

function EpisodePickerItem({item, highlightString, selected, onMouseOver, scrollIntoView, onClick}) {
    const {episode, podcast} = item;
    const artworkUrl = episode.artworkUrl || podcast.artworkUrl;

    return (
        <InputListItem
            className="my-[.2rem] flex cursor-pointer items-center gap-3 rounded-md px-3 py-2 text-left text-black dark:text-white"
            dataTestId={TEST_ID}
            item={item}
            scrollIntoView={scrollIntoView}
            selected={selected}
            selectedClassName="bg-grey-100 dark:bg-grey-900"
            onClick={onClick}
            onMouseOver={onMouseOver}
        >
            <EpisodeArtwork artworkUrl={artworkUrl} className="size-9 rounded" iconClassName="size-4" />
            <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate text-sm font-medium leading-snug" data-testid={`${TEST_ID}-listOption-label`}>
                    <HighlightedString highlightString={highlightString} shouldHighlight={!!highlightString} string={episode.title} />
                </span>
                {episode.description && (
                    <span className="truncate text-[1.25rem] leading-snug text-grey-700 dark:text-grey-500">{episode.description}</span>
                )}
            </span>
            <span className="flex shrink-0 items-center gap-2 text-[1.25rem] leading-snug text-grey-600 dark:text-grey-500" data-testid={`${TEST_ID}-listOption-meta`}>
                {episode.status === 'draft' && (
                    <span className="rounded-sm bg-grey-200 px-1.5 py-px text-[1rem] font-semibold uppercase tracking-wide text-grey-700 dark:bg-grey-900 dark:text-grey-400">Draft</span>
                )}
                {episode.duration && <span className="tabular-nums">{episode.duration}</span>}
            </span>
        </InputListItem>
    );
}

function EmptyMessage({dataTestId, text}) {
    return (
        <p className="px-3 py-4 text-sm text-grey-700 dark:text-grey-500" data-testid={dataTestId}>{text}</p>
    );
}

function EpisodePreview({episodeId, podcastTitle, title, description, episodeUrl, duration, artworkUrl}) {
    if (!episodeId) {
        return (
            <div className="flex flex-col items-center gap-3 px-6 py-10 text-center" data-testid="podcast-placeholder">
                <div className="flex size-14 items-center justify-center rounded-xl" style={{backgroundColor: PODCAST_BRAND_COLOR}}>
                    <PodcastIcon className="size-7 text-white" />
                </div>
                <div className="text-[1.6rem] font-semibold text-black dark:text-white">No episode selected</div>
                <div className="text-[1.4rem] text-grey-700 dark:text-grey-500">Click to choose an episode from one of your podcasts.</div>
            </div>
        );
    }

    return (
        <div className="flex items-center gap-6 p-6" data-testid="podcast-episode">
            <EpisodeArtwork artworkUrl={artworkUrl} className="size-22 rounded-xl" iconClassName="size-12" />
            <div className="flex min-w-0 flex-1 flex-col justify-center">
                {podcastTitle && (
                    <div className="truncate text-[1.3rem] font-medium uppercase tracking-wide text-grey-700 dark:text-grey-500" data-testid="podcast-episode-show">{podcastTitle}</div>
                )}
                <div className="truncate text-[2.1rem] font-semibold text-black dark:text-white" data-testid="podcast-episode-title">{title}</div>
                {description && (
                    <div className="mt-1 line-clamp-2 text-[1.4rem] leading-normal text-grey-700 dark:text-grey-500">{description}</div>
                )}
                <div className="mt-2 flex items-center gap-3 text-[1.3rem] text-grey-600 dark:text-grey-600">
                    {duration && <span className="tabular-nums">{duration}</span>}
                    {episodeUrl && <span className="truncate">{episodeUrl}</span>}
                </div>
            </div>
        </div>
    );
}

function EpisodeArtwork({artworkUrl, className, iconClassName}) {
    if (artworkUrl) {
        return <img alt="" className={`shrink-0 object-cover ${className}`} src={artworkUrl} />;
    }
    return (
        <span className={`flex shrink-0 items-center justify-center ${className}`} style={{backgroundColor: PODCAST_BRAND_COLOR}}>
            <PodcastIcon className={`text-white ${iconClassName}`} />
        </span>
    );
}

PodcastCard.propTypes = {
    podcasts: PropTypes.arrayOf(podcastShape),
    episodeId: PropTypes.string,
    podcastTitle: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    episodeUrl: PropTypes.string,
    duration: PropTypes.string,
    artworkUrl: PropTypes.string,
    isEditing: PropTypes.bool,
    onSelect: PropTypes.func,
    onCancel: PropTypes.func
};

EpisodePicker.propTypes = {
    podcasts: PropTypes.arrayOf(podcastShape).isRequired,
    episodeId: PropTypes.string,
    onSelect: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

EpisodePickerItem.propTypes = {
    item: PropTypes.object.isRequired,
    highlightString: PropTypes.string,
    selected: PropTypes.bool,
    onMouseOver: PropTypes.func,
    scrollIntoView: PropTypes.bool,
    onClick: PropTypes.func.isRequired
};

EmptyMessage.propTypes = {
    dataTestId: PropTypes.string,
    text: PropTypes.string.isRequired
};

EpisodePreview.propTypes = {
    episodeId: PropTypes.string,
    podcastTitle: PropTypes.string,
    title: PropTypes.string,
    description: PropTypes.string,
    episodeUrl: PropTypes.string,
    duration: PropTypes.string,
    artworkUrl: PropTypes.string
};

EpisodeArtwork.propTypes = {
    artworkUrl: PropTypes.string,
    className: PropTypes.string,
    iconClassName: PropTypes.string
};
