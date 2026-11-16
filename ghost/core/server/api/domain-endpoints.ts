import path from 'node:path';
import { IncorrectUsageError } from '@tryghost/errors';
import { domainsRoot, getDomainManifest } from '../../foundation/domains/manifest';

const apiFramework = require('@tryghost/api-framework');

/**
 * Builds API pipelines for the endpoint files a domain keeps in its http/
 * folder. A domain's endpoint file is the same controller definition the files
 * in ./endpoints hold; the domain does not import the API framework's pipeline,
 * the serializers or the validators, so that is done here.
 */

type Pipeline = Record<string, (frame: unknown) => Promise<unknown>>;

const pipelines = new Map<string, Pipeline>();

/**
 * The pipeline for one endpoint file, built the first time it is asked for.
 *
 * @param domain - The domain folder's name.
 * @param file - The file in the domain's http/ folder, without its extension.
 * @param apiType - 'content' for the Content API's serializers and validators.
 */
export function domainEndpoint(domain: string, file: string, apiType?: 'content'): Pipeline {
  const key = `${domain}/${file}/${apiType ?? 'admin'}`;
  let pipeline = pipelines.get(key);
  if (!pipeline) {
    const module = getDomainManifest().load(path.join(domainsRoot, domain, 'http', file)) as {
      default?: unknown;
    };
    const controller = module.default ?? module;
    if (typeof controller !== 'object' || controller === null || !('docName' in controller)) {
      throw new IncorrectUsageError({
        message: `ghost/domains/${domain}/http/${file} must default-export an API controller definition.`,
      });
    }
    // Loaded here rather than at the top: the serializers reach most of Ghost.
    const localUtils = require('./endpoints/utils');
    pipeline = apiFramework.pipeline(controller, localUtils, apiType) as Pipeline;
    pipelines.set(key, pipeline);
  }
  return pipeline;
}
