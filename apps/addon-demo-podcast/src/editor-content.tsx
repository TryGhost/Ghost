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

const PLAYBACK_RATES = [
    {label: '1×', spokenLabel: '1', value: 1},
    {label: '1.25×', spokenLabel: '1.25', value: 1.25},
    {label: '1.5×', spokenLabel: '1.5', value: 1.5},
    {label: '2×', spokenLabel: '2', value: 2}
] as const;

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

function formatTimecode(value: number) {
    const totalSeconds = Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    const paddedSeconds = String(seconds).padStart(2, '0');

    return hours > 0
        ? `${hours}:${String(minutes).padStart(2, '0')}:${paddedSeconds}`
        : `${minutes}:${paddedSeconds}`;
}

function EpisodeDetails({episode, interactive}: {episode: Episode; interactive: boolean}) {
    const audio = useRef<HTMLAudioElement>(null);
    const [playing, setPlaying] = useState(false);
    const [progress, setProgress] = useState(0);
    const [currentTime, setCurrentTime] = useState(0);
    const [mediaDuration, setMediaDuration] = useState(0);
    const [playbackRateIndex, setPlaybackRateIndex] = useState(0);
    const [muted, setMuted] = useState(false);
    const playbackRate = PLAYBACK_RATES[playbackRateIndex];

    if (!episode.title) {
        return (
            <article className="podcast-card podcast-card--empty">
                <p className="podcast-card__show">Podcast</p>
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
            setCurrentTime(0);
            return;
        }
        setCurrentTime(element.currentTime);
        setMediaDuration(element.duration);
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

    const seekBy = (seconds: number) => {
        const element = audio.current;
        if (!element || !Number.isFinite(element.duration) || element.duration <= 0) {
            return;
        }
        element.currentTime = Math.max(0, Math.min(element.duration, element.currentTime + seconds));
        updateProgress();
    };

    const cyclePlaybackRate = () => {
        const nextIndex = (playbackRateIndex + 1) % PLAYBACK_RATES.length;
        const nextRate = PLAYBACK_RATES[nextIndex];
        setPlaybackRateIndex(nextIndex);
        if (audio.current) {
            audio.current.playbackRate = nextRate.value;
        }
    };

    const toggleMuted = () => {
        if (!audio.current) {
            return;
        }
        audio.current.muted = !audio.current.muted;
        setMuted(audio.current.muted);
    };

    const totalTime = mediaDuration > 0 ? formatTimecode(mediaDuration) : episode.duration || '--:--';

    const artwork = episode.artworkUrl && (
        <img alt={`${episode.showName || episode.title} artwork`} src={episode.artworkUrl} />
    );

    return (
        <article className="podcast-card">
            {episode.canonicalUrl && artwork ? <a className="podcast-card__artwork" href={episode.canonicalUrl}>{artwork}</a> : artwork}
            <div className="podcast-card__body">
                {episode.showName && <p className="podcast-card__show">{episode.canonicalUrl ? <a href={episode.canonicalUrl}>{episode.showName}</a> : episode.showName}</p>}
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
                                setCurrentTime(0);
                            }}
                            onLoadedMetadata={updateProgress}
                            onPause={() => setPlaying(false)}
                            onPlay={() => setPlaying(true)}
                            onTimeUpdate={updateProgress}
                        />
                        <button aria-label={playing ? 'Pause episode' : 'Play episode'} className="podcast-card__play" type="button" onClick={() => void togglePlayback()}>
                            <svg aria-hidden="true" viewBox="0 0 20 20">
                                {playing ? (
                                    <>
                                        <rect height="12" rx="1" width="4" x="4" y="4" />
                                        <rect height="12" rx="1" width="4" x="12" y="4" />
                                    </>
                                ) : <path d="M6.5 4.5v11l8-5.5z" />}
                            </svg>
                        </button>
                        <div className="podcast-card__transport">
                            <input
                                aria-label="Episode progress"
                                className="podcast-card__progress"
                                max="100"
                                min="0"
                                step="0.1"
                                style={{background: `linear-gradient(to right, #181816 ${progress}%, #d6d6d1 ${progress}%)`}}
                                type="range"
                                value={progress}
                                onInput={event => seek(Number(event.currentTarget.value))}
                            />
                            <div className="podcast-card__controls">
                                <div className="podcast-card__actions">
                                    <button aria-label="Go back 10 seconds" className="podcast-card__control" type="button" onClick={() => seekBy(-10)}>
                                        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8V4L2 7l3 3V8a8 8 0 1 1-1 4" /><text x="12" y="15">10</text></svg>
                                    </button>
                                    <button aria-label={`Playback speed ${playbackRate.spokenLabel} times`} className="podcast-card__speed" type="button" onClick={cyclePlaybackRate}>{playbackRate.label}</button>
                                    <button aria-label="Skip forward 30 seconds" className="podcast-card__control" type="button" onClick={() => seekBy(30)}>
                                        <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M19 8V4l3 3-3 3V8a8 8 0 1 0 1 4" /><text x="12" y="15">30</text></svg>
                                    </button>
                                    <button aria-label={muted ? 'Unmute episode' : 'Mute episode'} className="podcast-card__control" type="button" onClick={toggleMuted}>
                                        <svg aria-hidden="true" viewBox="0 0 24 24">
                                            <path d="M4 9v6h4l5 4V5L8 9H4z" />
                                            {muted ? <path d="m17 9 4 6m0-6-4 6" /> : <path d="M16 9.5a4 4 0 0 1 0 5m2-7a7 7 0 0 1 0 9" />}
                                        </svg>
                                    </button>
                                </div>
                                <span className="podcast-card__time"><time>{formatTimecode(currentTime)}</time><span aria-hidden="true"> / </span><time>{totalTime}</time></span>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </article>
    );
}

function PortableEpisodeDetails({episode}: {episode: Episode}) {
    if (!episode.title) {
        return (
            <article style={{borderBottom: '1px solid #c9c9c5', borderTop: '1px solid #c9c9c5', color: '#181816', padding: '22px 0 24px'}}>
                <p style={{color: '#6f6f6b', fontSize: '11px', fontWeight: '700', letterSpacing: '.12em', margin: '0 0 12px', textTransform: 'uppercase'}}>Podcast</p>
                <h2 style={{fontSize: '26px', fontWeight: '400', lineHeight: '1.15', margin: '0 0 8px'}}>Add a podcast episode</h2>
                <p style={{color: '#4a4a47', lineHeight: '1.5', margin: '0'}}>Paste an episode URL in the card settings to resolve its details.</p>
            </article>
        );
    }

    const player = (
        <span style={{borderTop: '1px solid #d6d6d1', color: '#181816', display: 'table', marginTop: '18px', paddingTop: '14px', textDecoration: 'none', width: '100%'}}>
            <span style={{background: '#181816', borderRadius: '999px', color: '#ffffff', display: 'table-cell', fontSize: '12px', height: '32px', textAlign: 'center', verticalAlign: 'middle', width: '32px'}}>▶</span>
            <span style={{display: 'table-cell', padding: '0 12px', verticalAlign: 'middle', width: '100%'}}>
                <span style={{background: '#d6d6d1', display: 'block', height: '3px', width: '100%'}}></span>
            </span>
            <span style={{color: '#6f6f6b', display: 'table-cell', fontSize: '12px', paddingRight: '14px', verticalAlign: 'middle', whiteSpace: 'nowrap'}}>0:00 / {episode.duration || '--:--'}</span>
        </span>
    );

    return (
        <article style={{border: '1px solid #d6d6d1', color: '#181816', padding: '22px'}}>
            <table role="presentation" style={{borderCollapse: 'collapse', width: '100%'}}>
                <tbody>
                    <tr>
                        {episode.artworkUrl && (
                            <td style={{padding: '0 18px 0 0', verticalAlign: 'top', width: '88px'}}>
                                <img alt={`${episode.showName || episode.title} artwork`} src={episode.artworkUrl} style={{display: 'block', height: '88px', objectFit: 'cover', width: '88px'}} />
                            </td>
                        )}
                        <td style={{padding: '0', verticalAlign: 'top'}}>
                            {episode.showName && (
                                <p style={{color: '#6f6f6b', fontSize: '11px', fontWeight: '700', letterSpacing: '.1em', margin: '0 0 8px', textTransform: 'uppercase'}}>
                                    {episode.canonicalUrl ? <a href={episode.canonicalUrl} style={{color: 'inherit', textDecoration: 'underline', textDecorationColor: '#bcbcb7', textUnderlineOffset: '3px'}}>{episode.showName}</a> : episode.showName}
                                </p>
                            )}
                            <h2 style={{fontSize: '24px', fontWeight: '400', letterSpacing: '-.015em', lineHeight: '1.18', margin: '0'}}>{episode.title}</h2>
                            {episode.description && <p style={{color: '#4a4a47', fontSize: '14px', lineHeight: '1.5', margin: '10px 0 0'}}>{episode.description}</p>}
                        </td>
                    </tr>
                </tbody>
            </table>
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
            .podcast-card { box-sizing:border-box;display:flex;gap:22px;padding:22px;border:1px solid #d6d6d1;background:#fff;color:#181816 }
            .podcast-card__artwork { flex:0 0 auto }
            .podcast-card__artwork>img,.podcast-card>img { display:block;width:142px;height:142px;object-fit:cover }
            .podcast-card__body { display:flex;flex:1;flex-direction:column;min-width:0 }
            .podcast-card__show { margin:0;color:#6f6f6b;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase }
            .podcast-card__show a { color:inherit;text-decoration-line:underline;text-decoration-color:#bcbcb7;text-underline-offset:3px }
            .podcast-card h2 { margin:7px 0 6px;font-size:27px;font-weight:400;letter-spacing:-.02em;line-height:1.12 }
            .podcast-card h2 a { color:inherit;text-decoration:none }
            .podcast-card p { display:-webkit-box;overflow:hidden;margin:5px 0 12px;color:#4a4a47;line-height:1.45;-webkit-box-orient:vertical;-webkit-line-clamp:2 }
            .podcast-card__player { display:flex;align-items:center;gap:12px;margin-top:auto;padding-top:14px;border-top:1px solid #d6d6d1 }
            .podcast-card__player audio { display:none }
            .podcast-card__play { display:grid;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;place-items:center;border:0;border-radius:999px;background:#181816;color:#fff;cursor:pointer }
            .podcast-card__play svg { width:20px;height:20px;fill:currentColor }
            .podcast-card__transport { display:grid;flex:1;gap:8px;min-width:90px }
            .podcast-card__progress { width:100%;height:3px;margin:0;border:0;border-radius:0;appearance:none;cursor:pointer }
            .podcast-card__progress::-webkit-slider-thumb { width:11px;height:11px;border:0;border-radius:999px;appearance:none;background:#181816 }
            .podcast-card__progress::-moz-range-thumb { width:11px;height:11px;border:0;border-radius:999px;background:#181816 }
            .podcast-card__controls { display:flex;align-items:center;justify-content:space-between;gap:12px }
            .podcast-card__actions { display:flex;align-items:center;gap:5px }
            .podcast-card__control,.podcast-card__speed { display:grid;height:24px;margin:0;padding:0;place-items:center;border:0;background:transparent;color:#6f6f6b;cursor:pointer }
            .podcast-card__control { width:24px }
            .podcast-card__control svg { width:20px;height:20px;fill:none;stroke:currentColor;stroke-linecap:round;stroke-linejoin:round;stroke-width:1.4 }
            .podcast-card__control text { fill:currentColor;stroke:none;font-family:inherit;font-size:7px;font-weight:700;text-anchor:middle }
            .podcast-card__speed { min-width:30px;padding-inline:5px;border:1px solid #bcbcb7;border-radius:3px;font-family:inherit;font-size:10px;font-weight:700 }
            .podcast-card__time { flex:0 0 auto;color:#6f6f6b;font-family:inherit;font-size:11px;font-weight:500;white-space:nowrap }
            .podcast-card--empty { display:block;padding:26px 2px;border-inline:0 }
            .podcast-card--empty h2 { margin:7px 0 8px }
            .podcast-card--empty p { display:block;max-width:52ch;margin:0 }
            @media (max-width:520px) { .podcast-card { gap:16px;padding:18px }.podcast-card__artwork>img,.podcast-card>img { width:88px;height:88px }.podcast-card h2 { font-size:22px }.podcast-card p { font-size:14px }.podcast-card__control:last-child { display:none } }
            @media (max-width:380px) { .podcast-card { display:block }.podcast-card__artwork>img,.podcast-card>img { width:96px;height:96px;margin-bottom:16px }.podcast-card__player { margin-top:16px } }
        `,
        initialHeight: 240
    };
}

export default defineEditorBlockRenderer(renderPodcast, {hydrate: true});
