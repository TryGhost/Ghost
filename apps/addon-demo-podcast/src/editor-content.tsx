import {defineEditorBlockRenderer} from '@tryghost/addon-kit/editor';
import {useRef, useState} from 'preact/hooks';
import type {AddonEditorBlockRequest} from '@tryghost/addon-kit/editor';

type Episode = {
    title: string;
    showName: string;
    description: string;
    artworkUrl: string;
    audioUrl: string;
    canonicalUrl: string;
    duration: string;
};

function readEpisode(props: Record<string, unknown>): Episode {
    const value = (name: string) => typeof props[name] === 'string' ? props[name] : '';
    return {
        title: value('title'),
        showName: value('showName'),
        description: value('description'),
        artworkUrl: value('artworkUrl'),
        audioUrl: value('audioUrl'),
        canonicalUrl: value('canonicalUrl'),
        duration: value('duration')
    };
}

function EpisodeDetails({episode, interactive}: {episode: Episode; interactive: boolean}) {
    const audio = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);

    if (!episode.title) {
        return (
            <article className="podcast-card podcast-card--empty">
                <h2>Add a podcast episode</h2>
                <p>Paste an episode URL in the card settings to resolve its artwork, description, and audio.</p>
            </article>
        );
    }

    const togglePlayback = async () => {
        if (!audio.current) {
            return;
        }
        if (audio.current.paused) {
            try {
                await audio.current.play();
                setPlaying(true);
            } catch {
                setPlaying(false);
            }
        } else {
            audio.current.pause();
            setPlaying(false);
        }
    };

    return (
        <article className="podcast-card">
            {episode.artworkUrl && <img alt={`${episode.showName || episode.title} artwork`} src={episode.artworkUrl} />}
            <div className="podcast-card__body">
                {episode.showName && <p className="podcast-card__show">{episode.showName}</p>}
                <h2>{episode.title}</h2>
                {episode.duration && <p className="podcast-card__duration">{episode.duration}</p>}
                {episode.description && <p>{episode.description}</p>}
                {interactive && episode.audioUrl && (
                    <div className="podcast-card__player">
                        <audio ref={audio} preload="none" src={episode.audioUrl} onEnded={() => setPlaying(false)} />
                        <button type="button" onClick={() => void togglePlayback()}>{playing ? 'Pause episode' : 'Play episode'}</button>
                    </div>
                )}
                {episode.canonicalUrl && <p><a href={episode.canonicalUrl}>Listen on the source site</a></p>}
            </div>
        </article>
    );
}

function renderPodcast({blockName, props}: AddonEditorBlockRequest) {
    if (blockName !== 'podcast-player') {
        throw new Error(`Unknown editor block: ${blockName}`);
    }

    const episode = readEpisode(props);
    return {
        content: <EpisodeDetails episode={episode} interactive={true} />,
        portableContent: <EpisodeDetails episode={episode} interactive={false} />,
        css: `
            .podcast-card { box-sizing:border-box;display:flex;gap:24px;min-height:260px;padding:28px;border:1px solid #d8d8dc;border-radius:18px;background:#fff;color:#19191b;font-family:ui-sans-serif,system-ui,sans-serif }
            .podcast-card>img { width:180px;height:180px;border-radius:14px;object-fit:cover }
            .podcast-card__body { flex:1;min-width:0 }
            .podcast-card__show { margin:0;color:#6b5dd3;font-size:13px;font-weight:700;text-transform:uppercase }
            .podcast-card h2 { margin:8px 0;font-size:25px;line-height:1.2 }
            .podcast-card p { margin:8px 0;color:#59595f;line-height:1.5 }
            .podcast-card__duration { font-size:13px }
            .podcast-card button { margin:10px 0;padding:10px 16px;border:0;border-radius:999px;background:#19191b;color:#fff;font:inherit;font-weight:700;cursor:pointer }
            .podcast-card a { color:#5541b5;font-weight:650 }
            .podcast-card--empty { display:block }
            @media (max-width:520px) { .podcast-card { display:block }.podcast-card>img { width:100%;height:auto;aspect-ratio:1 } }
        `,
        initialHeight: 320
    };
}

export default defineEditorBlockRenderer(renderPodcast, {hydrate: true});
