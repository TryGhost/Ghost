import type { ServiceDefinition } from '@tryghost/kernel/define-service';
import application from '../../bootstrap/app';

/**
 * Transitional. Gives a service definition a `.service` getter that asks
 * Ghost's one application for the instance, for the code that still reads a
 * service off the module it imports.
 *
 * A definition holds no instance; the application does. This getter is the
 * only place that assumes there is exactly one application in the process, so
 * it cannot survive several sites in one process. A root drops `alias()` when
 * nothing reads its `.service` any more: each reader is handed the service
 * instead, as an entry in the `needs` of its own definition.
 */
export function alias<Service, Needs>(
  definition: ServiceDefinition<Service, Needs>,
): ServiceDefinition<Service, Needs> & { readonly service: Service } {
  return Object.defineProperty(definition, 'service', {
    // Configurable, so that a test can replace the getter.
    configurable: true,
    enumerable: true,
    get: () => application.services.get(definition),
  }) as ServiceDefinition<Service, Needs> & { readonly service: Service };
}
