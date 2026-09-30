import type { PluginOption } from 'vite';
import path from 'path';
import fs from 'fs';

const RENDERER_SOURCE = path.resolve(__dirname, '../../koenig/koenig-lexical/dist/embed-renderer');

// Deliberately outside built/admin: Ghost serves built/admin/assets from its own
// domain, and the renderer must only ever be served from a separate domain.
// Self-hosters copy these files to that domain.
const RENDERER_DESTINATION = path.resolve(__dirname, '../../ghost/core/core/built/embed-renderer');
const ADMIN_RENDERER_DESTINATION = path.resolve(
  __dirname,
  '../../ghost/core/core/built/admin/assets/koenig-lexical/embed-renderer',
);

// Vite plugin to ship Koenig's embed renderer with Ghost
export function embedRendererPlugin() {
  let isBuild = false;

  return {
    name: 'embed-renderer',
    configResolved(resolvedConfig) {
      isBuild = resolvedConfig.command === 'build';
    },
    closeBundle() {
      if (!isBuild) {
        return;
      }

      if (!fs.existsSync(RENDERER_SOURCE)) {
        throw new Error(
          `Koenig's embed renderer is missing from ${RENDERER_SOURCE}. Build @tryghost/koenig-lexical first.`,
        );
      }

      if (fs.existsSync(ADMIN_RENDERER_DESTINATION)) {
        throw new Error(
          `Koenig's embed renderer must not be served with Admin assets from ${ADMIN_RENDERER_DESTINATION}.`,
        );
      }

      fs.rmSync(RENDERER_DESTINATION, { recursive: true, force: true });
      fs.cpSync(RENDERER_SOURCE, RENDERER_DESTINATION, { recursive: true });
    },
  } as const satisfies PluginOption;
}
