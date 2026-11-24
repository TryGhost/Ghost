import type { Logger } from '#kernel/logging';
import { createLogger } from '#foundry/logging';
import { getInstance, setInstance } from '@tryghost/logging/factory';
import { loggingOptions } from './logging-options';

type Config = Parameters<typeof loggingOptions>[0];

/**
 * Builds Ghost's one logger: Ghost's options, handed to the framework.
 * Boot calls this before anything else can log.
 */
export function buildLogger(config: Config): Logger {
  // Registered with the logging library, so existing
  // require('@tryghost/logging') calls get this same logger.
  return getInstance() ?? setInstance(createLogger(loggingOptions(config)));
}
