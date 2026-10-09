import React from 'react';
import { flushSync } from 'react-dom';

/*
 * The suite runs on React's production build (vitest.acceptance.config.ts),
 * whose act() only throws. This stand-in starts the callback inside flushSync,
 * so a render it requests (render, rerender, unmount) commits with its effects
 * before act resolves, then yields a task for updates the callback made after
 * awaiting. vitest-browser-react reads act once at import, so this file loads
 * before anything imports it.
 */
async function act<T>(callback: () => T | Promise<T>): Promise<T> {
  let pending!: T | Promise<T>;
  flushSync(() => {
    pending = callback();
  });
  const result = await pending;
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  return result;
}

Object.assign(React, { act, unstable_act: act });
