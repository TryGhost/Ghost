import { InternalServerError, NotFoundError } from '@tryghost/errors';
import tpl from '@tryghost/tpl';
import type { Site } from '#support/site';
import { models } from '../../../shared/transition/models';

const messages = {
  notFound: '{resource} not found.',
};

type Model = { toJSON(): Record<string, unknown> };

type IntegrationModels = {
  Integration: {
    findOne(data: { id?: string }, options?: Record<string, unknown>): Promise<Model | null>;
    edit(data: unknown, options: Record<string, unknown>): Promise<Model>;
  };
  ApiKey: {
    findOne(data: { id: string }): Promise<Model | null>;
    refreshSecret(
      data: Record<string, unknown>,
      options: Record<string, unknown>,
    ): Promise<unknown>;
  };
};

export type EditIntegrationOptions = Record<string, unknown> & { id?: string; keyid?: string };

/** Edits an integration, or refreshes the secret of one of its API keys when `options.keyid` is set. */
export class EditIntegration {
  Integration: IntegrationModels['Integration'];
  ApiKey: IntegrationModels['ApiKey'];

  constructor({ Integration, ApiKey }: IntegrationModels) {
    this.Integration = Integration;
    this.ApiKey = ApiKey;
  }

  async handle(data: unknown, options: EditIntegrationOptions): Promise<Model | null> {
    if (options.keyid) {
      const model = await this.ApiKey.findOne({ id: options.keyid });

      if (!model) {
        throw new NotFoundError({
          message: tpl(messages.notFound, {
            resource: 'ApiKey',
          }),
        });
      }
      try {
        await this.ApiKey.refreshSecret(
          model.toJSON(),
          Object.assign({}, options, { id: options.keyid }),
        );

        return await this.Integration.findOne(
          { id: options.id },
          {
            withRelated: ['api_keys', 'webhooks'],
          },
        );
      } catch (err) {
        throw new InternalServerError({
          err: err as Error,
        });
      }
    }

    try {
      return await this.Integration.edit(data, Object.assign(options, { require: true }));
    } catch (error) {
      const message = (error as { message?: unknown }).message;
      if (message === 'NotFound' || message === 'EmptyResponse') {
        throw new NotFoundError({
          message: tpl(messages.notFound, {
            resource: 'Integration',
          }),
        });
      }

      throw error;
    }
  }
}

export const editIntegration = (site: Site) =>
  new EditIntegration(models(site) as IntegrationModels);
