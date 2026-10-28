import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { createBrowserEnvironment, loadScript } from '../../../utils/browser-test-utils';

const card = `
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

describe('audio card controls', function () {
  let env: ReturnType<typeof createBrowserEnvironment>;
  let frames: Map<number, FrameRequestCallback>;
  let cards: {
    element: Element;
    audio: HTMLAudioElement;
    play: HTMLButtonElement;
    pause: HTMLButtonElement;
  }[];

  function advanceFrame() {
    const frame = frames.entries().next().value;
    assert.ok(frame);
    const [id, callback] = frame;
    frames.delete(id);
    callback(0);
  }

  beforeEach(function () {
    env = createBrowserEnvironment({
      html: `<!DOCTYPE html><html><body>${card}${card}</body></html>`,
    });
    frames = new Map();
    let nextFrame = 0;
    env.window.requestAnimationFrame = (callback) => {
      nextFrame += 1;
      frames.set(nextFrame, callback);
      return nextFrame;
    };
    env.window.cancelAnimationFrame = (id) => frames.delete(id);

    cards = [...env.document.querySelectorAll('.kg-audio-card')].map((element) => {
      const audio = element.querySelector('audio');
      const play = element.querySelector<HTMLButtonElement>('.kg-audio-play-icon');
      const pause = element.querySelector<HTMLButtonElement>('.kg-audio-pause-icon');
      assert.ok(audio && play && pause);
      audio.play = vi.fn(() => Promise.resolve());
      audio.pause = vi.fn();
      Object.defineProperty(audio, 'duration', { value: 4.2 });
      return {
        element,
        audio,
        play,
        pause,
      };
    });

    const script = readFileSync(
      path.join(__dirname, '../../../../core/frontend/src/cards/js/audio.js'),
      'utf8',
    );
    loadScript(env, script);
    cards.forEach(({ audio }) => audio.dispatchEvent(new env.window.Event('loadedmetadata')));
  });

  afterEach(function () {
    env.dom.window.close();
  });

  it.each([false, true])('replay and isolated cards: %s', function (advance) {
    const [first, second] = cards;
    first.play.click();
    second.play.click();
    if (advance) {
      advanceFrame();
    }
    expect(first.play.classList.contains('kg-audio-hide')).toBe(true);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(false);

    first.audio.currentTime = first.audio.duration;
    first.audio.dispatchEvent(new env.window.Event('ended'));

    expect(first.play.classList.contains('kg-audio-hide')).toBe(false);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(true);
    expect(first.element.querySelector('.kg-audio-current-time')?.textContent).toBe('0:04');
    expect(first.element.querySelector<HTMLInputElement>('.kg-audio-seek-slider')?.value).toBe('4');
    expect(
      first.element
        .querySelector<HTMLElement>('.kg-audio-player-container')
        ?.style.getPropertyValue('--seek-before-width'),
    ).toBe('100%');
    expect(second.play.classList.contains('kg-audio-hide')).toBe(true);
    expect(second.pause.classList.contains('kg-audio-hide')).toBe(false);
    expect(frames.size).toBe(1);

    second.audio.currentTime = 1;
    advanceFrame();
    expect(second.element.querySelector('.kg-audio-current-time')?.textContent).toBe('0:01');
    expect(second.element.querySelector<HTMLInputElement>('.kg-audio-seek-slider')?.value).toBe(
      '1',
    );

    first.play.click();
    expect(first.audio.play).toHaveBeenCalledTimes(2);
    expect(first.play.classList.contains('kg-audio-hide')).toBe(true);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(false);
  });

  it.each([false, true])('manual pause, frame run: %s', function (advance) {
    const [first] = cards;
    first.play.click();
    if (advance) {
      advanceFrame();
    }
    first.pause.click();

    expect(first.audio.pause).toHaveBeenCalledOnce();
    expect(first.play.classList.contains('kg-audio-hide')).toBe(false);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(true);
    expect(frames.size).toBe(0);
  });

  it.each([false, true])('seeking and finishing, frame run: %s', function (advance) {
    const [first] = cards;
    first.play.click();
    if (advance) {
      advanceFrame();
    }
    Object.defineProperty(first.audio, 'paused', { value: false });
    const slider = first.element.querySelector<HTMLInputElement>('.kg-audio-seek-slider');
    assert.ok(slider);
    slider.value = '2';
    slider.dispatchEvent(new env.window.Event('input'));
    slider.dispatchEvent(new env.window.Event('change'));
    expect(frames.size).toBe(1);
    if (advance) {
      advanceFrame();
    }

    first.audio.currentTime = first.audio.duration;
    first.audio.dispatchEvent(new env.window.Event('ended'));
    expect(frames.size).toBe(0);
    expect(first.play.classList.contains('kg-audio-hide')).toBe(false);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(true);
  });
});
