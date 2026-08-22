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
    const [progress, setProgress] = useState(0);

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

    const updateProgress = () => {
        const element = audio.current;
        if (!element || !Number.isFinite(element.duration) || element.duration <= 0) {
            setProgress(0);
            return;
        }
        setProgress((element.currentTime / element.duration) * 100);
    };

    const seek = (nextProgress: number) => {
        const element = audio.current;
        if (!element || !Number.isFinite(element.duration) || element.duration <= 0) {
            return;
        }
        element.currentTime = (nextProgress / 100) * element.duration;
        setProgress(nextProgress);
    };

    const artwork = episode.artworkUrl && (
        <img alt={`${episode.showName || episode.title} artwork`} src={episode.artworkUrl} />
    );

    return (
        <article className="podcast-card">
            {episode.canonicalUrl && artwork ? <a className="podcast-card__artwork" href={episode.canonicalUrl}>{artwork}</a> : artwork}
            <div className="podcast-card__body">
                {episode.showName && <p className="podcast-card__show">{episode.showName}</p>}
                <h2>{episode.canonicalUrl ? <a href={episode.canonicalUrl}>{episode.title}</a> : episode.title}</h2>
                {episode.description && <p>{episode.description}</p>}
                {interactive && episode.audioUrl && (
                    <div className="podcast-card__player">
                        <audio
                            ref={audio}
                            preload="metadata"
                            src={episode.audioUrl}
                            onEnded={() => {
                                setPlaying(false);
                                setProgress(0);
                            }}
                            onPause={() => setPlaying(false)}
                            onPlay={() => setPlaying(true)}
                            onTimeUpdate={updateProgress}
                        />
                        <button aria-label={playing ? 'Pause episode' : 'Play episode'} className="podcast-card__play" type="button" onClick={() => void togglePlayback()}>
                            <span aria-hidden="true">{playing ? 'Ⅱ' : '▶'}</span>
                        </button>
                        <div className="podcast-card__timeline">
                            <span>{playing ? 'Playing episode' : 'Listen to episode'}</span>
                            <input
                                aria-label="Episode progress"
                                className="podcast-card__progress"
                                max="100"
                                min="0"
                                step="0.1"
                                type="range"
                                value={progress}
                                onInput={event => seek(Number(event.currentTarget.value))}
                            />
                        </div>
                        {episode.duration && <span className="podcast-card__duration">{episode.duration}</span>}
                        {episode.canonicalUrl && <a aria-label="Open episode page" className="podcast-card__open" href={episode.canonicalUrl}>↗</a>}
                    </div>
                )}
            </div>
        </article>
    );
}

function PortableEpisodeDetails({episode}: {episode: Episode}) {
    if (!episode.title) {
        return (
            <article style={{background: '#f7f7f8', border: '1px solid #dedee3', borderRadius: '18px', color: '#19191b', fontFamily: 'Arial, sans-serif', padding: '24px'}}>
                <h2 style={{fontSize: '22px', margin: '0 0 8px'}}>Add a podcast episode</h2>
                <p style={{color: '#626269', lineHeight: '1.5', margin: '0'}}>Paste an episode URL in the card settings to resolve its details.</p>
            </article>
        );
    }

    const player = (
        <span style={{alignItems: 'center', background: '#19191b', borderRadius: '14px', color: '#ffffff', display: 'table', marginTop: '18px', padding: '12px 14px', textDecoration: 'none', width: '100%'}}>
            <span style={{background: '#ffffff', borderRadius: '999px', color: '#19191b', display: 'table-cell', fontSize: '14px', height: '34px', textAlign: 'center', verticalAlign: 'middle', width: '34px'}}>▶</span>
            <span style={{display: 'table-cell', fontSize: '14px', fontWeight: '700', paddingLeft: '12px', verticalAlign: 'middle'}}>Play episode on {episode.showName || 'the publisher site'}</span>
            {episode.duration && <span style={{display: 'table-cell', fontSize: '12px', opacity: '.72', paddingLeft: '12px', textAlign: 'right', verticalAlign: 'middle', whiteSpace: 'nowrap'}}>{episode.duration}</span>}
        </span>
    );

    return (
        <article style={{background: '#ffffff', border: '1px solid #dedee3', borderRadius: '18px', color: '#19191b', fontFamily: 'Arial, sans-serif', padding: '24px'}}>
            {episode.artworkUrl && <img alt={`${episode.showName || episode.title} artwork`} src={episode.artworkUrl} style={{borderRadius: '14px', display: 'block', height: '96px', marginBottom: '18px', objectFit: 'cover', width: '96px'}} />}
            {episode.showName && <p style={{color: '#6b5dd3', fontSize: '12px', fontWeight: '700', letterSpacing: '.06em', margin: '0 0 8px', textTransform: 'uppercase'}}>{episode.showName}</p>}
            <h2 style={{fontSize: '23px', lineHeight: '1.25', margin: '0'}}>{episode.title}</h2>
            {episode.description && <p style={{color: '#59595f', lineHeight: '1.5', margin: '10px 0 0'}}>{episode.description}</p>}
            {episode.canonicalUrl ? <a href={episode.canonicalUrl} style={{color: 'inherit', display: 'block', textDecoration: 'none'}}>{player}</a> : player}
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
        portableContent: <PortableEpisodeDetails episode={episode} />,
        css: `
            .podcast-card { box-sizing:border-box;display:flex;gap:24px;min-height:260px;padding:24px;border:1px solid #dedee3;border-radius:20px;background:linear-gradient(145deg,#fff,#f8f7fb);box-shadow:0 12px 30px rgba(32,29,45,.08);color:#19191b;font-family:ui-sans-serif,system-ui,sans-serif }
            .podcast-card__artwork { flex:0 0 auto }
            .podcast-card__artwork>img,.podcast-card>img { display:block;width:172px;height:172px;border-radius:15px;box-shadow:0 8px 20px rgba(32,29,45,.14);object-fit:cover }
            .podcast-card__body { display:flex;flex:1;flex-direction:column;min-width:0 }
            .podcast-card__show { margin:0;color:#6b5dd3;font-size:12px;font-weight:750;letter-spacing:.06em;text-transform:uppercase }
            .podcast-card h2 { margin:7px 0;font-size:23px;line-height:1.2 }
            .podcast-card h2 a { color:inherit;text-decoration:none }
            .podcast-card p { margin:5px 0 12px;color:#59595f;line-height:1.45 }
            .podcast-card__player { display:flex;align-items:center;gap:12px;margin-top:auto;padding:11px 12px;border-radius:15px;background:#19191b;color:#fff }
            .podcast-card__player audio { display:none }
            .podcast-card__play { display:grid;flex:0 0 38px;width:38px;height:38px;margin:0;padding:0;place-items:center;border:0;border-radius:999px;background:#fff;color:#19191b;font:inherit;cursor:pointer }
            .podcast-card__play span { transform:translateX(1px) }
            .podcast-card__timeline { display:grid;flex:1;gap:5px;min-width:70px;color:#fff;font-size:12px;font-weight:650 }
            .podcast-card__progress { width:100%;height:3px;margin:0;accent-color:#8f7dea;cursor:pointer }
            .podcast-card__duration { flex:0 0 auto;color:#c9c7cf;font-size:12px }
            .podcast-card__open { display:grid;flex:0 0 30px;width:30px;height:30px;place-items:center;border-radius:999px;color:#fff;text-decoration:none }
            .podcast-card--empty { display:block }
            @media (max-width:520px) { .podcast-card { display:block }.podcast-card__artwork>img,.podcast-card>img { width:100%;height:auto;aspect-ratio:1;margin-bottom:20px }.podcast-card__player { margin-top:18px }.podcast-card__duration { display:none } }
        `,
        initialHeight: 320
    };
}

export default defineEditorBlockRenderer(renderPodcast, {hydrate: true});
