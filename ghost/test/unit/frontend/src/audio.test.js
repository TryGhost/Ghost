/* global expect, vi */

const fs = require('fs');
const path = require('path');
const { createBrowserEnvironment, loadScript } = require('../../../utils/browser-test-utils');

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
  let env;
  let frames;
  let cards;

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
      audio.play = vi.fn(() => Promise.resolve());
      audio.pause = vi.fn();
      Object.defineProperty(audio, 'duration', { value: 4.2 });
      return {
        element,
        audio,
        play: element.querySelector('.kg-audio-play-icon'),
        pause: element.querySelector('.kg-audio-pause-icon'),
      };
    });

    const script = fs.readFileSync(
      path.join(__dirname, '../../../../core/frontend/src/cards/js/audio.js'),
      'utf8',
    );
    loadScript(env, script);
    cards.forEach(({ audio }) => audio.dispatchEvent(new env.window.Event('loadedmetadata')));
  });

  afterEach(function () {
    env.dom.window.close();
  });

  it('returns to Play at the end and replays with one click without affecting another card', function () {
    const [first, second] = cards;
    first.play.click();
    second.play.click();
    expect(first.play.classList.contains('kg-audio-hide')).toBe(true);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(false);

    first.audio.currentTime = first.audio.duration;
    first.audio.dispatchEvent(new env.window.Event('ended'));

    expect(first.play.classList.contains('kg-audio-hide')).toBe(false);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(true);
    expect(first.element.querySelector('.kg-audio-current-time').textContent).toBe('0:04');
    expect(first.element.querySelector('.kg-audio-seek-slider').value).toBe('4');
    expect(
      first.element
        .querySelector('.kg-audio-player-container')
        .style.getPropertyValue('--seek-before-width'),
    ).toBe('100%');
    expect(second.play.classList.contains('kg-audio-hide')).toBe(true);
    expect(second.pause.classList.contains('kg-audio-hide')).toBe(false);
    expect(frames.size).toBe(1);

    first.play.click();
    expect(first.audio.play).toHaveBeenCalledTimes(2);
    expect(first.play.classList.contains('kg-audio-hide')).toBe(true);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(false);
  });

  it('stops the progress updates and shows Play when paused manually', function () {
    const [first] = cards;
    first.play.click();
    first.pause.click();

    expect(first.audio.pause).toHaveBeenCalledOnce();
    expect(first.play.classList.contains('kg-audio-hide')).toBe(false);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(true);
    expect(frames.size).toBe(0);
  });

  it('stops the pending progress update after seeking and finishing', function () {
    const [first] = cards;
    first.play.click();
    Object.defineProperty(first.audio, 'paused', { value: false });
    const slider = first.element.querySelector('.kg-audio-seek-slider');
    slider.value = '2';
    slider.dispatchEvent(new env.window.Event('input'));
    slider.dispatchEvent(new env.window.Event('change'));
    expect(frames.size).toBe(1);

    first.audio.currentTime = first.audio.duration;
    first.audio.dispatchEvent(new env.window.Event('ended'));
    expect(frames.size).toBe(0);
    expect(first.play.classList.contains('kg-audio-hide')).toBe(false);
    expect(first.pause.classList.contains('kg-audio-hide')).toBe(true);
  });
});
