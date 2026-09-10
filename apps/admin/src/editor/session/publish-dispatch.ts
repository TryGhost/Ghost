import type { PublishOptions, SaveCompletion, ScheduleOptions } from '@/editor/engine/save-engine';
import type { PublishDispatcher } from '@/editor/publish/publish-options';

/** The engine's status commands, as the publish flow's dispatcher consumes them. */
export interface StatusDispatchPorts {
  publish: (options?: PublishOptions) => Promise<SaveCompletion>;
  schedule: (options: ScheduleOptions) => Promise<SaveCompletion>;
  revert: () => Promise<SaveCompletion>;
}

/**
 * Routes a publish-flow command to the matching engine intent. The flow's
 * command options are already the engine's, so nothing is reshaped here.
 */
export function createPublishDispatcher(ports: StatusDispatchPorts): PublishDispatcher {
  return (command) => {
    switch (command.kind) {
      case 'publish':
        return ports.publish(command.options);
      case 'schedule':
        return ports.schedule(command.options);
      default:
        return ports.revert();
    }
  };
}
