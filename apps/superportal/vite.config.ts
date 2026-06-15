import {posix, resolve} from 'node:path';
import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {localesPlugin} from './src/build/locales-plugin';

/**
 * Multi-target build:
 *  - portal.min.js  (ESM, code-split into chunks for lazy feature loading)
 *  - signup-form.min.js (UMD, single-file, for third-party site embed)
 *
 * Selected via the `SP_TARGET` env var. Default = portal.
 */
const target = (process.env.SP_TARGET ?? 'portal') as 'portal' | 'embed';

export default defineConfig(({command}) => {
    const isDev = command === 'serve';
    const nodeEnv = process.env.NODE_ENV ?? (isDev ? 'development' : 'production');

    if (target === 'embed') {
        return {
            plugins: [react(), tailwind()],
            define: {
                'process.env.NODE_ENV': JSON.stringify(nodeEnv)
            },
            build: {
                outDir: resolve(__dirname, 'dist/embed'),
                emptyOutDir: true,
                sourcemap: true,
                lib: {
                    entry: resolve(__dirname, 'src/embed/signup-form/index.tsx'),
                    formats: ['umd'],
                    name: 'GhostSignupForm',
                    fileName: () => 'signup-form.min.js'
                }
            }
        };
    }

    // portal target — ESM + code splitting
    return {
        plugins: [react(), tailwind(), localesPlugin()],
        define: {
            'process.env.NODE_ENV': JSON.stringify(nodeEnv),
            SUPERPORTAL_VERSION: JSON.stringify(process.env.npm_package_version ?? '0.0.0')
        },
        appType: 'mpa',
        // Dev server serves index.html for local testing; the real entry is src/shell/index.ts
        // which dev.html references via <script type="module">.
        root: isDev ? resolve(__dirname) : undefined,
        publicDir: resolve(__dirname, 'public'),
        // Port 4175 matches the Docker dev-gateway's expected `PORTAL_DEV_SERVER`
        // proxy target, so the existing `/ghost/assets/portal/*` route inside the
        // Ghost backend resolves to this server. Stop `apps/portal`'s dev server
        // before starting this one — they share the port intentionally.
        //
        // host: '0.0.0.0' is REQUIRED so the Docker dev-gateway (Caddy) can reach
        // this server via `host.docker.internal:4175`. Without it Vite binds to
        // 127.0.0.1 only and Caddy gets 502 Bad Gateway.
        // allowedHosts: true permits any Host header (Caddy proxies with the
        // upstream's hostport, which Vite would otherwise reject).
        server: {
            host: '0.0.0.0',
            port: 4175,
            cors: true,
            allowedHosts: true
        },
        preview: {
            host: '0.0.0.0',
            port: 4175,
            cors: true,
            allowedHosts: true
        },
        // Hardening only: routes any future asset-from-JS reference (e.g. an
        // imported SVG) through the runtime version-pinning resolver so it
        // stays correct when served from a version-ranged CDN URL. Chunk
        // import specifiers are NOT covered by this API — they are kept safe
        // by the bootstrap entry indirection (src/shell/bootstrap.ts).
        experimental: {
            renderBuiltUrl(filename, {hostId, hostType}) {
                if (hostType === 'js') {
                    const relativePath = posix.relative(posix.dirname(hostId), filename);
                    const specifier = JSON.stringify(relativePath.startsWith('.') ? relativePath : `./${relativePath}`);
                    const resolved = `new URL(${specifier}, import.meta.url).href`;
                    return {runtime: `(window.__superportalAssetUrl ? window.__superportalAssetUrl(${resolved}) : ${resolved})`};
                }
                return {relative: true};
            }
        },
        build: {
            outDir: resolve(__dirname, 'dist/portal'),
            emptyOutDir: true,
            sourcemap: true,
            cssCodeSplit: true,
            target: 'es2022',
            modulePreload: false,
            rollupOptions: {
                input: {
                    portal: resolve(__dirname, 'src/shell/bootstrap.ts'),
                    shell: resolve(__dirname, 'src/shell/index.ts')
                },
                output: {
                    format: 'es',
                    // shell.min.js is unhashed: the bootstrap computes its URL at
                    // runtime and pins it to an exact package version, which is
                    // immutable on the CDN — a hash would add nothing.
                    entryFileNames: chunk => (chunk.name === 'portal' ? 'portal.min.js' : 'chunks/shell.min.js'),
                    chunkFileNames: 'chunks/[name]-[hash].js',
                    assetFileNames: ({names}) => {
                        const name = names[0] ?? '';
                        if (name.endsWith('.css')) {
                            return 'chunks/[name]-[hash][extname]';
                        }
                        return 'assets/[name]-[hash][extname]';
                    },
                    // Surface clean public chunk names for the prefetch orchestrator.
                    manualChunks(id) {
                        if (id.includes('/src/features/share/')) return 'feature-share';
                        if (id.includes('/src/features/members/')) return 'feature-members';
                        if (id.includes('/src/features/gift/')) return 'feature-gift';
                        if (id.includes('/src/features/announcement/')) return 'feature-announcement';
                        if (id.includes('/src/features/search/')) return 'feature-search';
                        if (id.includes('/src/features/offers/')) return 'feature-offers';
                        if (id.includes('/src/features/donations/')) return 'feature-donations';
                        if (id.includes('/src/features/feedback/')) return 'feature-feedback';
                        if (id.includes('/src/features/unsubscribe/')) return 'feature-unsubscribe';
                        if (id.includes('/src/features/recommendations/')) return 'feature-recommendations';
                        if (id.includes('/src/shared/api-client/')) return 'shared-api-client';
                        if (id.includes('/src/shared/components/modal')) return 'shared-modal-shell';
                        // Catchall for the rest of /src/shared/ (cn, log, future tiny
                        // utilities). Without this, anything not explicitly carved out
                        // bleeds into whichever feature chunk Rollup processes first,
                        // and the entry's static import of those utilities transitively
                        // pulls that feature chunk in unconditionally — defeating the
                        // `state.features`-gated lazy loading.
                        if (id.includes('/src/shared/')) return 'shell-utils';
                        // Vite's preload helper is a synthetic module; co-locate it
                        // with the rest of the shell utilities so it doesn't end up
                        // in a feature chunk for the same reason.
                        if (id.includes('vite/preload-helper')) return 'shell-utils';
                        if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/') || id.includes('/node_modules/scheduler/')) return 'shared-react';
                        if (id.includes('/node_modules/@tryghost/i18n/')) return 'shared-i18n';
                        // Reached only via dynamic import in shared/sentry.ts, so it
                        // stays an async chunk — fetched solely when a DSN is set.
                        if (id.includes('/node_modules/@sentry/')) return 'vendor-sentry';
                        return undefined;
                    }
                }
            }
        }
    };
});
