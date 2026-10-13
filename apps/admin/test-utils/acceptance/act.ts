import React from 'react';

/**
 * React's act for specs that wait for React to finish the work a gesture
 * started. Like vitest-browser-react's own act, it marks the page an act
 * environment for the duration, or React warns that it isn't one. Reads
 * `React.act` per call, so a harness stand-in for it applies here too.
 */
export async function act(callback: () => Promise<void>): Promise<void> {
  const actEnvironment = globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean };
  const wasActEnvironment = actEnvironment.IS_REACT_ACT_ENVIRONMENT;
  actEnvironment.IS_REACT_ACT_ENVIRONMENT = true;
  try {
    await React.act(callback);
  } finally {
    actEnvironment.IS_REACT_ACT_ENVIRONMENT = wasActEnvironment;
  }
}
