import { InternalServerError, NotFoundError } from '@tryghost/errors';
import tpl from '@tryghost/tpl';

const messages = {
  notFound: '{resource} not found.',
};

type Model = { toJSON(): Record<string, unknown> };

type IntegrationModel = {
  findOne(data: { id?: string }, options?: Record<string, unknown>): Promise<Model | null>;
  edit(data: unknown, options: Record<string, unknown>): Promise<Model>;
};

type ApiKeyModel = {
  findOne(data: { id: string }): Promise<Model | null>;
  refreshSecret(data: Record<string, unknown>, options: Record<string, unknown>): Promise<unknown>;
};

export type EditIntegrationOptions = Record<string, unknown> & { id?: string; keyid?: string };

export type IntegrationsServiceDeps = {
  IntegrationModel: IntegrationModel;
  ApiKeyModel: ApiKeyModel;
};

export class IntegrationsService {
  IntegrationModel: IntegrationModel;
  ApiKeyModel: ApiKeyModel;

  constructor({ IntegrationModel, ApiKeyModel }: IntegrationsServiceDeps) {
    this.IntegrationModel = IntegrationModel;
    this.ApiKeyModel = ApiKeyModel;
  }

  /** Edits an integration, or refreshes the secret of one of its API keys when `options.keyid` is set. */
  async edit(data: unknown, options: EditIntegrationOptions): Promise<Model | null> {
    if (options.keyid) {
      const model = await this.ApiKeyModel.findOne({ id: options.keyid });

      if (!model) {
        throw new NotFoundError({
          message: tpl(messages.notFound, {
            resource: 'ApiKey',
          }),
        });
      }
      try {
        await this.ApiKeyModel.refreshSecret(
          model.toJSON(),
          Object.assign({}, options, { id: options.keyid }),
        );

        return await this.IntegrationModel.findOne(
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
      return await this.IntegrationModel.edit(data, Object.assign(options, { require: true }));
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
