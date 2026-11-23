import type { Foundation } from '@tryghost/kernel/foundation';
import { createServices, type Services } from './services.ts';

/**
 * One thing an application does when it starts. The foundry runs it and knows nothing else
 * about it: what it is, and why it is where it is in the list, are the application's business.
 */
export interface Step<State> {
  /** Names the step in errors and logs. */
  readonly name: string;
  /**
   * Does the step. A promise is awaited before the next step runs. Whatever it started that has
   * to be stopped again is handed to `run.onStop`.
   */
  readonly run: (run: Run<State>) => unknown;
}

/** What a step is handed. */
export interface Run<State> {
  readonly foundation: Foundation;
  readonly services: Services;
  /** What the steps of one start hand to each other. The application supplies it. */
  readonly state: State;
  /** Registers something to undo when the application stops. Run last registered first. */
  onStop(name: string, stop: () => unknown): void;
  /** Stops the application, for a step that starts whatever decides when that is. */
  stop(): Promise<void>;
}

/** One application: its foundation and what has been built on it. */
export interface Application {
  readonly name: string;
  readonly foundation: Foundation;
  readonly services: Services;
  /**
   * Runs the steps in the order given, each to completion before the next. A step that fails
   * ends the start with its error; the steps before it stay as they are until `stop()`.
   */
  start<State>(steps: readonly Step<State>[], state: State): Promise<State>;
  /**
   * Stops what was started: runs what the steps registered with `onStop`, last registered first,
   * then closes the services. A failure is logged and the rest still run.
   */
  stop(): Promise<void>;
}

/**
 * Builds an application around a foundation. Nothing is loaded, started or read: an application
 * does only what its bootstrap then tells it to.
 */
export function createApplication({
  name,
  foundation,
}: {
  /** Names the application in errors and logs. */
  readonly name: string;
  readonly foundation: Foundation;
}): Application {
  const services = createServices({ name, foundation });
  let stops: { readonly name: string; readonly stop: () => unknown }[] = [];

  return {
    name,
    foundation,
    services,
    async start(steps, state) {
      const run = {
        foundation,
        services,
        state,
        stop: () => this.stop(),
        onStop(stopName: string, stop: () => unknown) {
          stops.push({ name: stopName, stop });
        },
      };
      for (const step of steps) {
        await step.run(run);
      }
      return state;
    },
    async stop() {
      const stopping = stops.reverse();
      stops = [];
      for (const { name: stopName, stop } of stopping) {
        try {
          await stop();
        } catch (error) {
          foundation.logger.error(`${name} could not stop ${stopName}`, error);
        }
      }
      await services.close();
    },
  };
}
