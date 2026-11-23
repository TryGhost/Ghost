import {
  defineService as describe,
  type ServiceDefinition,
  type ServiceNeeds,
  type ServiceOptions,
} from '#kernel/define-service';
import application from '../app';

export { legacyEvent } from './legacy-events';

/**
 * EARMARKED. The kernel's `defineService`, with a `.service` getter added to the definition it
 * returns. The getter asks Ghost's one application for the instance, which is built then if this
 * is its first use.
 *
 * It exists because about 260 places read a service off the module they import
 * (`require('../tiers').default.service`). It is the only thing that assumes one application in
 * the process: a definition holds no instance, so with several applications there would be no
 * one instance to return.
 *
 * A service root leaves it, importing `#kernel/define-service` instead, once nothing reads its
 * `.service`: each reader is handed the service, as a `need` of its own definition or as an
 * argument from whatever builds it. This file leaves with the last root.
 */
export function defineService<
  Service,
  const Needs extends ServiceNeeds = Record<never, never>,
  Extras extends object | undefined = undefined,
>(
  ...args: Parameters<typeof describe<Service, Needs, Extras>>
): AliasedDefinition<Service, Needs, Extras> {
  const definition = describe<Service, Needs, Extras>(...args);
  return Object.defineProperty(definition, 'service', {
    // Configurable, so that a test can replace the getter.
    configurable: true,
    enumerable: true,
    get: () => application.services.get(definition as ServiceDefinition<Service, Needs>),
  }) as AliasedDefinition<Service, Needs, Extras>;
}

/** A definition whose instance in Ghost's one application can be read off it. */
export type AliasedDefinition<
  Service,
  Needs extends ServiceNeeds = Record<never, never>,
  Extras extends object | undefined = undefined,
> = ReturnType<typeof describe<Service, Needs, Extras>> & {
  /** The instance in Ghost's one application, built on first use. */
  readonly service: Service;
};

export type { ServiceOptions };
