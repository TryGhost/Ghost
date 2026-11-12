import type { Frame } from '@tryghost/api-framework';
import path from 'path';

type MediaFrame = Frame<{ data: { url: string } }> & { file: { name: string; ext: string } };

module.exports = {
  uploadThumbnail(apiConfig: unknown, frame: MediaFrame) {
    const parentFileName = path.basename(frame.data.url, path.extname(frame.data.url));
    frame.file.name = `${parentFileName}_thumb${frame.file.ext}`;
  },
};
