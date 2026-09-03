import type { GiftStep } from './types';

const GIFT_HISTORY_STATE_KEY = 'ghostPortalGiftHistory';

interface GiftHistoryState {
  depth: number;
}

function getHistoryState(): Record<string, unknown> {
  const state = window.history.state;
  return state && typeof state === 'object' ? state : {};
}

function getGiftHistoryState(): GiftHistoryState | null {
  const value = getHistoryState()[GIFT_HISTORY_STATE_KEY];
  if (!value || typeof value !== 'object' || !('depth' in value)) {
    return null;
  }

  const { depth } = value as { depth?: unknown };
  return typeof depth === 'number' && depth > 0 ? { depth } : null;
}

function getGiftHash(step: GiftStep) {
  return step === 'delivery' ? '#/portal/gift/delivery' : '#/portal/gift';
}

function dispatchHashChange() {
  window.dispatchEvent(new HashChangeEvent('hashchange'));
}

export function setGiftRoute({ step, replace = false }: { step: GiftStep; replace?: boolean }) {
  const hash = getGiftHash(step);

  if (replace) {
    window.history.replaceState(window.history.state, '', hash);
    dispatchHashChange();
    return;
  }

  const giftHistoryState = getGiftHistoryState();
  const nextState = giftHistoryState
    ? {
        ...getHistoryState(),
        [GIFT_HISTORY_STATE_KEY]: { depth: giftHistoryState.depth + 1 },
      }
    : window.history.state;

  window.history.pushState(nextState, '', hash);
  dispatchHashChange();
}

export function ensureGiftPlanRoute() {
  if (window.location.hash === '#/portal/gift') {
    return;
  }

  window.history.pushState(
    {
      ...getHistoryState(),
      [GIFT_HISTORY_STATE_KEY]: { depth: 1 },
    },
    '',
    '#/portal/gift',
  );
}

export function restoreGiftEntryRoute() {
  const giftHistoryState = getGiftHistoryState();
  if (!giftHistoryState) {
    return false;
  }

  window.history.go(-giftHistoryState.depth);
  return true;
}
