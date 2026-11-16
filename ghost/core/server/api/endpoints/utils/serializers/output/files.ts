import type { Frame } from '@tryghost/api-framework';
import config from '../../../../../../shared/config';
import urlUtils from '../../../../../../shared/url-utils';

type FilesFrame = Frame<{ data: { ref?: string | null } }>;

function getURL(urlPath: string) {
  const media = new RegExp('^' + config.getSubdir() + '/' + urlUtils.STATIC_FILES_URL_PREFIX);
  const absolute = media.test(urlPath) ? true : false;

  if (absolute) {
    // Remove the sub-directory from the URL because ghostConfig will add it back.
    urlPath = urlPath.replace(new RegExp('^' + config.getSubdir()), '');
    const baseUrl = config.getSiteUrl().replace(/\/$/, '');
    urlPath = baseUrl + urlPath;
  }

  return urlPath;
}

module.exports = {
  upload({ filePath }: { filePath: string }, apiConfig: unknown, frame: FilesFrame) {
    return (frame.response = {
      files: [
        {
          url: getURL(filePath),
          ref: frame.data.ref || null,
        },
      ],
    });
  },
};
