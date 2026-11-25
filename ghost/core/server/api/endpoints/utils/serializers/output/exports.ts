import type { Frame } from '@tryghost/api-framework';
import debugFactory from '@tryghost/debug';
import { createZipStreamResponse } from './stream-zip-response';

const debug = debugFactory('api:endpoints:utils:serializers:output:exports');

module.exports = {
  download(
    data: { archive: NodeJS.ReadableStream; filename: string },
    apiConfig: unknown,
    frame: Frame,
  ) {
    debug('download');

    frame.response = createZipStreamResponse({
      source: data.archive,
      filename: data.filename,
    });
  },
};
