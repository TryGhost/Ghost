import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createBrowserEnvironment, loadScript } from '../../../utils/browser-test-utils';

const cardHtml = `
  <div class="kg-audio-card">
    <div class="kg-audio-player-container">
      <audio></audio>
      <button class="kg-audio-play-icon">Play</button>
      <button class="kg-audio-pause-icon kg-audio-hide">Pause</button>
      <span class="kg-audio-current-time">0:00</span>
      <span class="kg-audio-duration"></span>
      <input type="range" class="kg-audio-seek-slider" max="100" value="0">
      <button class="kg-audio-playback-rate">1×</button>
      <button class="kg-audio-unmute-icon">Unmute</button>
      <button class="kg-audio-mute-icon kg-audio-hide">Mute</button>
      <input type="range" class="kg-audio-volume-slider" max="100" value="100">
    </div>
  </div>
`;

describe('audio.js', function () {
  let scriptContent: string;
  let env: ReturnType<typeof createBrowserEnvironment>;
  let frames: Map<number, FrameRequestCallback>;

  beforeAll(function () {
    scriptContent = readFileSync(
      path.join(__dirname, '../../../../core/frontend/src/cards/js/audio.js'),
      'utf8',
    );
  });

  beforeEach(function () {
    env = createBrowserEnvironment({
      html: `<!DOCTYPE html><html><body>${cardHtml}${cardHtml}</body></html>`,
    });

    frames = new Map();
    let nextFrameId = 0;
    env.window.requestAnimationFrame = (callback) => {
      nextFrameId += 1;
      frames.set(nextFrameId, callback);
      return nextFrameId;
    };
    env.window.cancelAnimationFrame = (id) => frames.delete(id);

    env.document.querySelectorAll('audio').forEach((audio) => {
      audio.play = vi.fn(() => Promise.resolve());
      audio.pause = vi.fn();
      Object.defineProperty(audio, 'readyState', { value: 1 });
      Object.defineProperty(audio, 'duration', { value: 4.2 });
    });

    loadScript(env, scriptContent);
  });

  afterEach(function () {
    env.dom.window.close();
  });

  function getCards() {
    return [...env.document.querySelectorAll('.kg-audio-card')].map((card) => ({
      audio: card.querySelector('audio')!,
      play: card.querySelector<HTMLButtonElement>('.kg-audio-play-icon')!,
      pause: card.querySelector<HTMLButtonElement>('.kg-audio-pause-icon')!,
      container: card.querySelector<HTMLElement>('.kg-audio-player-container')!,
      currentTime: card.querySelector('.kg-audio-current-time')!,
      seekSlider: card.querySelector<HTMLInputElement>('.kg-audio-seek-slider')!,
    }));
  }

  type Card = ReturnType<typeof getCards>[number];

  function visibleIcons(card: Card) {
    return [card.play, card.pause]
      .filter((icon) => !icon.classList.contains('kg-audio-hide'))
      .map((icon) => icon.textContent);
  }

  function runNextFrame() {
    const [[id, callback]] = frames;
    frames.delete(id);
    callback(0);
  }

  function finishPlayback(card: Card) {
    card.audio.currentTime = card.audio.duration;
    card.audio.dispatchEvent(new env.window.Event('ended'));
  }

  it('shows the play icon and stops progress at the final position when playback ends', function () {
    const [card] = getCards();
    card.play.click();
    runNextFrame();

    finishPlayback(card);

    expect(visibleIcons(card)).toEqual(['Play']);
    expect(card.currentTime.textContent).toBe('0:04');
    expect(card.seekSlider.value).toBe('4');
    expect(card.container.style.getPropertyValue('--seek-before-width')).toBe('100%');
    expect(frames.size).toBe(0);
  });

  it('stops progress updates when playback ends right after seeking', function () {
    const [card] = getCards();
    card.play.click();
    Object.defineProperty(card.audio, 'paused', { value: false });
    card.seekSlider.value = '2';
    card.seekSlider.dispatchEvent(new env.window.Event('input'));
    card.seekSlider.dispatchEvent(new env.window.Event('change'));

    finishPlayback(card);

    expect(frames.size).toBe(0);
  });

  it('replays with a single click after playback ends', function () {
    const [card] = getCards();
    card.play.click();
    finishPlayback(card);
    expect(visibleIcons(card)).toEqual(['Play']);

    card.play.click();

    expect(card.audio.play).toHaveBeenCalledTimes(2);
    expect(visibleIcons(card)).toEqual(['Pause']);
  });

  it('keeps other cards playing when one card ends', function () {
    const [first, second] = getCards();
    first.play.click();
    second.play.click();

    finishPlayback(first);
    second.audio.currentTime = 1;
    runNextFrame();

    expect(visibleIcons(second)).toEqual(['Pause']);
    expect(second.currentTime.textContent).toBe('0:01');
    expect(frames.size).toBe(1);
  });
});
