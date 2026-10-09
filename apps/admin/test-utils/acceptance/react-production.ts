import React from 'react';

/*
 * The suite runs on React's production build (vitest.acceptance.config.ts),
 * whose act() only throws. This stand-in runs the callback, then yields a task
 * so the render React scheduled meanwhile commits. vitest-browser-react reads
 * act once at import, so this file loads before anything imports it.
 */
async function act<T>(callback: () => T | Promise<T>): Promise<T> {
  const result = await callback();
  await new Promise((resolve) => {
    setTimeout(resolve, 0);
  });
  return result;
}

Object.assign(React, { act, unstable_act: act });
