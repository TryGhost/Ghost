/* eslint-env browser */
/**
 * Ghost's script for apps' cards on the site. Each card's snapshot shows in a sandboxed frame,
 * which reports its height and the links readers click. An interactive card of an active app
 * also has a live frame on the app's own origin: loaded near the viewport, connected over its
 * own channel, and swapped in for the snapshot once it has started. Anything that goes wrong
 * leaves the snapshot.
 */
import { ThreadMessagePort } from '@quilted/threads';
import {
  LIVE_FRAME_CONNECT_TYPE,
  LIVE_FRAME_HELLO_TYPE,
  LIVE_FRAME_TIMEOUT_MS,
  isLiveFrameHeight,
} from '@tryghost/app-contracts/live-frame';

const SNAPSHOT_HEIGHT_MIN = 20;
const SNAPSHOT_HEIGHT_MAX = 4000;
const LIVE_SANDBOX = 'allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox';

/** Snapshot frames, by their window, so messages are matched to the exact frame. */
const snapshots = new Map();

function isNavigable(href) {
  try {
    const url = new URL(href);
    return ['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol);
  } catch (error) {
    return false;
  }
}

window.addEventListener('message', (event) => {
  const frame = snapshots.get(event.source);
  const message = event.data;
  if (!frame || !message || typeof message !== 'object') {
    return;
  }
  if (message.type === 'ghost-app-card:resize') {
    const height = Number(message.height);
    if (Number.isFinite(height) && height >= SNAPSHOT_HEIGHT_MIN && height <= SNAPSHOT_HEIGHT_MAX) {
      frame.style.height = `${Math.ceil(height)}px`;
      frame.setAttribute('height', String(Math.ceil(height)));
    }
  } else if (message.type === 'ghost-app-card:navigate') {
    // Only a reader's click navigates the page: a click in the frame activates this page too.
    const active = navigator.userActivation ? navigator.userActivation.isActive : false;
    if (active && typeof message.href === 'string' && isNavigable(message.href)) {
      window.location.assign(message.href);
    }
  }
});

function readPublicProperties(figure) {
  const script = figure.querySelector(':scope > script.kg-app-card-public');
  if (!script) {
    return {};
  }
  try {
    const value = JSON.parse(script.textContent || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch (error) {
    return {};
  }
}

function themeContext() {
  const root = getComputedStyle(document.documentElement);
  const body = getComputedStyle(document.body);
  return {
    mode:
      window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light',
    accent_color: root.getPropertyValue('--ghost-accent-color').trim() || '#15171a',
    font_family: body.fontFamily || 'sans-serif',
  };
}

/**
 * Loads a card's live frame from the app's origin, hidden, and swaps it in for the snapshot
 * once it has started. The frame speaks first; the page answers only that frame, from the
 * origin the card declares, with a port of its own.
 */
function goLive(figure, snapshot) {
  const src = figure.getAttribute('data-app-frame');
  const origin = figure.getAttribute('data-app-frame-origin');
  if (!src || !origin) {
    return;
  }

  const live = document.createElement('iframe');
  live.className = 'kg-app-card-live-frame';
  live.setAttribute('sandbox', LIVE_SANDBOX);
  live.setAttribute('referrerpolicy', 'strict-origin');
  live.setAttribute('allow', figure.getAttribute('data-app-allow') || '');
  live.setAttribute('title', snapshot.getAttribute('title') || 'Card');
  live.style.cssText =
    'border:0;display:block;width:100%;height:0;visibility:hidden;position:absolute';
  live.src = src;

  let thread;
  let settled = false;
  const finish = (started) => {
    if (settled) {
      return;
    }
    settled = true;
    window.removeEventListener('message', onHello);
    window.clearTimeout(timer);
    if (started) {
      live.style.cssText = `border:0;display:block;width:100%;height:${snapshot.style.height || `${snapshot.getAttribute('height')}px`}`;
      snapshot.remove();
      snapshots.delete(snapshot.contentWindow);
      figure.setAttribute('data-app-live', 'true');
    } else {
      if (thread) {
        thread.close();
      }
      live.remove();
    }
  };
  const timer = window.setTimeout(() => finish(false), LIVE_FRAME_TIMEOUT_MS);

  function onHello(event) {
    if (event.source !== live.contentWindow || event.origin !== origin) {
      return;
    }
    if (!event.data || event.data.type !== LIVE_FRAME_HELLO_TYPE || thread) {
      return;
    }
    const channel = new MessageChannel();
    thread = new ThreadMessagePort(channel.port1, {
      exports: {
        async resize(height) {
          if (!isLiveFrameHeight(height)) {
            throw new Error('Expected a height in CSS pixels');
          }
          live.style.height = `${Math.ceil(height)}px`;
        },
      },
    });
    channel.port1.start();
    live.contentWindow.postMessage({ type: LIVE_FRAME_CONNECT_TYPE }, origin, [channel.port2]);
    thread.imports
      .start({
        card: figure.getAttribute('data-app-card') || '',
        properties: readPublicProperties(figure),
        site: { url: window.location.origin, locale: document.documentElement.lang || 'en' },
        theme: themeContext(),
      })
      .then(
        () => finish(true),
        () => finish(false),
      );
  }

  window.addEventListener('message', onHello);
  figure.style.position = figure.style.position || 'relative';
  figure.append(live);
}

function setup() {
  const figures = document.querySelectorAll('figure.kg-app-card');
  const observer =
    'IntersectionObserver' in window
      ? new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                observer.unobserve(entry.target);
                const snapshot = entry.target.querySelector(
                  ':scope > iframe.kg-app-card-snapshot-frame',
                );
                if (snapshot) {
                  goLive(entry.target, snapshot);
                }
              }
            }
          },
          { rootMargin: '400px' },
        )
      : null;

  figures.forEach((figure) => {
    const snapshot = figure.querySelector(':scope > iframe.kg-app-card-snapshot-frame');
    if (!snapshot) {
      return;
    }
    const register = () => {
      if (snapshot.contentWindow) {
        snapshots.set(snapshot.contentWindow, snapshot);
        // The frame may have reported its height before this script ran; ask again.
        snapshot.contentWindow.postMessage({ type: 'ghost-app-card:measure' }, '*');
      }
    };
    register();
    snapshot.addEventListener('load', register);
    if (figure.hasAttribute('data-app-frame')) {
      if (observer) {
        observer.observe(figure);
      } else {
        goLive(figure, snapshot);
      }
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', setup);
} else {
  setup();
}
